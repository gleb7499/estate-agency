// Centralized mock data for the property card
// No network requests; available globally as window.MP_MOCK
// NOTE: demo data only — no real client information

(function(){
  const MP_MOCK = {
    id: 10050011,
    name: '2-комн. квартира, 58 м², 3/5 эт.',
    address: 'Демо-город, Примерный проспект, 7',
    photos: [
      'assets/mock/apartment-1.jpg',
      'assets/mock/apartment-2.jpg',
      'assets/mock/apartment-3.jpg',
      'assets/mock/apartment-4.jpg',
      'assets/mock/apartment-5.jpg',
    ],
    // Video for the first carousel item.
    // The demo video is not committed to the repo (see README "Demo video").
    // Put your own file at assets/mock/video.mp4 and restore the path here,
    // or pass any other URL via the `video` field.
    video: '',
    // The poster will be extracted automatically from the video itself
    facts: [
      { label: 'Общая площадь', value: '58 м²' },
      { label: 'Жилая площадь', value: '34 м²' },
      { label: 'Кухня', value: '18 м²' },
      { label: 'Этаж', value: '3/5' },
      { label: 'Год постройки', value: '2018' },
    ],
    price: 8750000,          // in the base currency (RUB)
    currency: 'RUB',         // currency code
    pricePerSqm: 150862,     // ₽/m², can be left null — will be computed from price and area
    totalAreaSqm: 58,        // for computing pricePerSqm when needed
    priceBreakdownTitle: 'Структура стоимости',
    priceBreakdown: [
      { label: 'Стоимость объекта', value: 8750000, type: 'currency', accent: true },
      { label: 'Первоначальный взнос (20%)', value: 1750000, type: 'currency', note: 'Рекомендация для одобрения ипотеки' },
      { label: 'Ежемесячный платёж (30 лет)', value: '≈ 48 900 ₽/мес', note: 'Расчёт при ставке 12% годовых' },
    ],
    // Deal terms ("Terms" section)
    terms: {
      saleType: 'Свободная (прямая)',   // Sale type
      firstSale: true,                  // First sale
      onlineViewing: true,              // Online viewing (on request)
      mortgage: true,                   // Mortgage
    },
    // About the property ("About the property" section) — 4x3
    about: [
      { label: 'Этаж', value: '3 из 5' },
      { label: 'Балкон/Лоджия', value: 'Лоджия' },
      { label: 'Отопление', value: 'Центральное' },

      { label: 'Общая площадь', value: '58 м²' },
      { label: 'Площадь балкона', value: '3,2 м²' },
      { label: 'Вид из окон', value: 'На улицу' },

      { label: 'Жилая площадь', value: '34 м²' },
      { label: 'Санузел', value: '1 совмещенный' },
      { label: 'Газ', value: 'Нет' },

      { label: 'Площадь кухни', value: '18 м²' },
      { label: 'Планировка', value: 'Изолированная' },
      { label: 'Ремонт', value: 'Евроремонт' },
    ],
    // About the building ("About the building" section) — 2x3 per the design
    building: [
      { label: 'Тип дома', value: 'Монолитный' },
      { label: 'Мусоропровод', value: 'Нет' },
      { label: 'Год постройки', value: '2018' },

      { label: 'Лифт', value: 'Пассажирский' },
      { label: 'Новый дом', value: 'Да' },
    ],
    // Seller's description
    description: 'Демонстрационное описание объекта. Просторная двухкомнатная квартира с функциональной планировкой: кухня-гостиная, изолированная спальня, совмещенный санузел. Окна выходят на тихий двор. В подъезде консьерж, во дворе наземный паркинг и детская площадка. Район с развитой инфраструктурой: школа, детский сад, магазины в шаговой доступности. Показ по предварительной записи.',
  };

  // Export to the global scope safely
  try { window.MP_MOCK = MP_MOCK; } catch (_) {}
})();
