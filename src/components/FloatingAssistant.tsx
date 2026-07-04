import { useState, useEffect } from 'react';
import { Bot, X, Send } from 'lucide-react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState<{role: 'user'|'assistant', text: string}[]>([{
    role: 'assistant', text: 'Hi! I am the marketplace AI expert. I can help you calculate materials, find suppliers, or answer construction questions.'
  }]);
  const [loading, setLoading] = useState(false);
  const [marketplaceContext, setMarketplaceContext] = useState('');

  useEffect(() => {
    async function fetchContext() {
      try {
        const storesQuery = query(collection(db, 'stores'), where('status', '==', 'active'), limit(5));
        const storesSnap = await getDocs(storesQuery);
        const stores = storesSnap.docs.map(d => d.data().name).join(', ');

        const productsQuery = query(collection(db, 'products'), limit(10));
        const productsSnap = await getDocs(productsQuery);
        const products = productsSnap.docs.map(d => d.data().name).join(', ');

        const categories = "Плитка и керамическая поверхность, Паркет и ламинат, Цементная шпаклёвка, Краски и эмали, Камень для горячих линий, Герметики, Изоляционные материалы, Листовой бетон, Балки и плиты, Огнеупорные изделия, Арматура, Песчаная и щебень, Цементы разных сортов";

        setMarketplaceContext(`Available Categories: ${categories}. Recommended Stores: ${stores || 'None yet'}. Available Products: ${products || 'None yet'}. Note: Do NOT access or mention passwords, usernames, or the admin panel.`);
      } catch (e) {
        console.error("Failed to load context", e);
      }
    }
    fetchContext();
  }, []);

  const sendMessage = async () => {
    if (!message.trim()) return;
    const currentMessage = message;
    setMessage('');
    
    const newChatLog = [...chatLog, {role: 'user' as const, text: currentMessage}];
    setChatLog(newChatLog);
    setLoading(true);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          message: currentMessage, 
          context: marketplaceContext,
          history: newChatLog
        })
      });
      const data = await res.json();
      setChatLog(prev => [...prev, {role: 'assistant', text: data.reply || 'Sorry, I encountered an error.'}]);
    } catch (err) {
      setChatLog(prev => [...prev, {role: 'assistant', text: 'Network error. Please try again later.'}]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 transition transform hover:scale-105 z-50 ${isOpen ? 'hidden' : 'block'}`}
      >
        <Bot className="w-7 h-7" />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
             <div className="flex items-center gap-2">
               <Bot className="w-6 h-6" />
               <span className="font-bold">AI Expert Assistant</span>
             </div>
             <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded-lg transition">
               <X className="w-5 h-5" />
             </button>
          </div>
          
          <div className="flex-grow p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
             {chatLog.map((log, i) => (
               <div key={i} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[80%] rounded-xl p-3 text-sm shadow-sm ${log.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'}`}>
                   {log.text}
                 </div>
               </div>
             ))}
             {loading && (
               <div className="flex justify-start">
                 <div className="max-w-[80%] rounded-xl p-3 text-sm shadow-sm bg-white border border-gray-100 text-gray-800 rounded-bl-none flex items-center gap-2">
                   <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                   <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                 </div>
               </div>
             )}
          </div>

          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input 
              type="text" 
              className="flex-grow bg-gray-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ask anything..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              disabled={loading || !message.trim()}
              className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
