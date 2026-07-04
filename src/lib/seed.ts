import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function seedDatabase(superAdminUid: string) {
  // Clear existing (optional, or just add new)
  // Generating realistic data
  const categories = [
    { id: 'cat_finishing', name: 'Отделочные материалы', icon: '🎨' },
    { id: 'cat_heat', name: 'Жар- и герметизационные системы', icon: '🔥' },
    { id: 'cat_concrete', name: 'Железобетонные конструкции', icon: '🏗️' },
    { id: 'cat_foundation', name: 'Фундаментные решения', icon: '🧱' },
  ];

  const storesData = [
    { name: 'СтройДвор', cat: 'cat_finishing', prefix: 'stroy' },
    { name: 'МастерДом', cat: 'cat_finishing', prefix: 'master' },
    { name: 'Изоляция+', cat: 'cat_heat', prefix: 'izol' },
    { name: 'ТеплоРесурс', cat: 'cat_heat', prefix: 'teplo' },
    { name: 'БетонСтрой', cat: 'cat_concrete', prefix: 'beton' },
    { name: 'ЖБИ Центр', cat: 'cat_concrete', prefix: 'gbi' },
    { name: 'ФундаментМаркет', cat: 'cat_foundation', prefix: 'fund' },
    { name: 'Основа', cat: 'cat_foundation', prefix: 'osnova' },
  ];

  const productTemplates: Record<string, any[]> = {
    cat_finishing: [
      { name: 'Плитка керамическая 30х30', price: 2500, desc: 'Керамическая плитка для пола.' },
      { name: 'Паркет дубовый', price: 8500, desc: 'Паркетная доска из натурального дуба.' },
      { name: 'Ламинат 33 класс', price: 3500, desc: 'Влагостойкий ламинат.' },
      { name: 'Цементная шпаклёвка', price: 1200, desc: 'Шпаклёвка для внутренних работ.' },
      { name: 'Краска акриловая', price: 4500, desc: 'Краска водоэмульсионная.' },
      { name: 'Эмаль универсальная', price: 1800, desc: 'Эмаль алкидная.' },
    ],
    cat_heat: [
      { name: 'Камень для сауны', price: 3500, desc: 'Камни для печей.' },
      { name: 'Герметик силиконовый', price: 1200, desc: 'Термостойкий герметик.' },
      { name: 'Герметик полиуретановый', price: 1500, desc: 'Шовный герметик.' },
      { name: 'Минвата', price: 4500, desc: 'Изоляционный материал.' },
      { name: 'Пенополистирол', price: 2500, desc: 'Утеплитель листовой.' },
    ],
    cat_concrete: [
      { name: 'Листовой бетон', price: 15000, desc: 'Бетонные панели.' },
      { name: 'Балка железобетонная', price: 25000, desc: 'Балка несущая.' },
      { name: 'Плита перекрытия', price: 45000, desc: 'Многопустотная плита.' },
      { name: 'Огнеупорный кирпич', price: 250, desc: 'Кирпич шамотный.' },
      { name: 'Бетонный блок', price: 800, desc: 'Блок стеновой.' },
    ],
    cat_foundation: [
      { name: 'Арматура 12мм', price: 450, desc: 'Рифленая арматура, цена за метр.' },
      { name: 'Песок строительный', price: 5000, desc: 'Песок мытый (1 тонна).' },
      { name: 'Щебень фракция 5-20', price: 6000, desc: 'Щебень гранитный (1 тонна).' },
      { name: 'Цемент М400', price: 2000, desc: 'Портландцемент 50кг.' },
      { name: 'Цемент М500', price: 2500, desc: 'Портландцемент высокой прочности 50кг.' },
    ],
  };

  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatch = async () => {
    if (opCount > 0) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  // 1. Add Categories
  for (const cat of categories) {
    const ref = doc(db, 'categories', cat.id);
    batch.set(ref, cat);
    opCount++;
  }

  // 2. Add Stores & Products
  for (let i = 0; i < storesData.length; i++) {
    const s = storesData[i];
    const storeId = `store_${s.prefix}_${i}`;
    const storeRef = doc(db, 'stores', storeId);
    
    // Almaty coordinates rough box
    const lat = 43.2 + Math.random() * 0.1;
    const lng = 76.8 + Math.random() * 0.1;

    batch.set(storeRef, {
      id: storeId,
      name: s.name,
      logoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
      bannerUrl: `https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=800&q=80`,
      gallery: [],
      description: `Welcome to ${s.name}, the best place for ${categories.find(c => c.id === s.cat)?.name}.`,
      phone: `+7 727 ${Math.floor(1000000 + Math.random() * 9000000)}`,
      address: `Random Street ${i + 1}, Almaty`,
      latitude: lat,
      longitude: lng,
      workingHours: '09:00 - 20:00',
      ownerId: superAdminUid,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      verifiedBadge: Math.random() > 0.5,
      deliveryEnabled: Math.random() > 0.3,
      rating: 4 + Math.random(),
      reviewCount: Math.floor(Math.random() * 50) + 1,
    });
    opCount++;
    if (opCount >= 450) await commitBatch();

    // Products for this store (let's add ~10-15 products per store)
    const templates = productTemplates[s.cat];
    const numProducts = 10 + Math.floor(Math.random() * 5); // 10 to 15
    for (let j = 0; j < numProducts; j++) {
      const template = templates[j % templates.length];
      const productId = `prod_${storeId}_${j}`;
      const prodRef = doc(db, 'products', productId);
      
      batch.set(prodRef, {
        id: productId,
        storeId: storeId,
        name: `${template.name} ${j > 9 ? j : ''}`.trim(),
        categoryId: s.cat,
        manufacturer: s.name + ' Brand',
        description: template.desc,
        price: template.price + Math.floor(Math.random() * 20),
        quantity: Math.floor(Math.random() * 100),
        expirationDate: null,
        images: [`https://placehold.co/400x400/png?text=${encodeURIComponent(template.name)}`],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      opCount++;
      if (opCount >= 450) await commitBatch();
    }
  }

  await commitBatch();
  console.log('Seeding completed!');
}
