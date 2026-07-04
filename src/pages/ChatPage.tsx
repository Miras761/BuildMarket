import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, orderBy, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/errorHandling';
import { Store, UserProfile } from '@/types';
import { Send, Image as ImageIcon } from 'lucide-react';

export default function ChatPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchParams] = useSearchParams();
  const queryChatId = searchParams.get('chatId');
  const { user } = useAuthStore();
  const [store, setStore] = useState<Store | null>(null);
  const [chatTargetName, setChatTargetName] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChatId = queryChatId || (user && storeId ? `${user.uid}_${storeId}` : null);

  useEffect(() => {
    if (!storeId || !user || !activeChatId) return;
    
    async function initChat() {
      try {
        const storeRef = doc(db, 'stores', storeId!);
        const storeSnap = await getDoc(storeRef);
        if (storeSnap.exists()) {
          const s = storeSnap.data() as Store;
          setStore(s);
          if (user.uid === s.ownerId && queryChatId) {
            // Admin is viewing, try to find customer name
            const chatSnap = await getDoc(doc(db, 'chats', queryChatId));
            if (chatSnap.exists() && chatSnap.data().userId) {
              const uSnap = await getDoc(doc(db, 'users', chatSnap.data().userId));
              if (uSnap.exists()) {
                setChatTargetName((uSnap.data() as UserProfile).displayName);
              }
            }
          } else {
            setChatTargetName(s.name);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
    initChat();

    const messagesRef = collection(db, 'chats', activeChatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'chat_messages');
    });

    return () => unsubscribe();
  }, [storeId, user, activeChatId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !storeId || !activeChatId) return;
    
    try {
      const chatRef = doc(db, 'chats', activeChatId);
      // We don't overwrite userId if admin is sending
      if (!queryChatId) {
        await setDoc(chatRef, {
          userId: user.uid,
          storeId: storeId,
          lastMessage: newMessage,
          lastMessageTime: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await setDoc(chatRef, {
          lastMessage: newMessage,
          lastMessageTime: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
        senderId: user.uid,
        text: newMessage,
        timestamp: serverTimestamp(),
        read: false
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chat_message');
    }
  };

  if (!user) return <div className="p-8 text-center">Please log in to chat.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-64px)] flex flex-col">
      <div className="bg-white rounded-t-3xl p-6 border-b border-gray-100 shadow-sm flex items-center gap-4">
        {store?.logoUrl ? (
          <img src={store.logoUrl} alt="Store" className="w-12 h-12 rounded-xl object-cover" />
        ) : (
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">{store?.name?.charAt(0) || 'S'}</div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{store?.name || 'Loading Store...'}</h1>
          <p className="text-sm text-green-600">Online</p>
        </div>
      </div>

      <div className="flex-grow bg-gray-50 overflow-y-auto p-6 flex flex-col gap-4 border-x border-gray-100">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${msg.senderId === user.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-900 rounded-bl-none border border-gray-100'}`}>
              <p>{msg.text}</p>
              <div className={`text-xs mt-1 ${msg.senderId === user.uid ? 'text-blue-200' : 'text-gray-400'}`}>
                {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Sending...'}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white rounded-b-3xl p-4 border-t border-gray-100 shadow-sm">
        <form onSubmit={handleSend} className="flex gap-2">
          <button type="button" className="p-3 text-gray-400 hover:text-blue-600 transition bg-gray-100 rounded-xl">
            <ImageIcon className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
