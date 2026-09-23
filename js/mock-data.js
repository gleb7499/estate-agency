// Centralized mock data for the property card
// No network requests; available globally as window.MP_MOCK

(function(){
  const MP_MOCK = {
    id: 58557936,
    name: '2-комн. квартира, 55 м², 2/4 эт.',
    address: 'Иркутск, Октябрьский, Карла Либкнехта, 112',
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
      { label: 'Общая площадь', value: '55 м²' },
      { label: 'Жилая площадь', value: '32 м²' },
      { label: 'Кухня', value: '20 м²' },
      { label: 'Этаж', value: '2/4' },
      { label: 'Год постройки', value: '2014' },
    ],
    price: 12300000,         // in the base currency (RUB)
    currency: 'RUB',         // currency code
    pricePerSqm: 223636,     // ₽/m², can be left null — will be computed from price and area
    totalAreaSqm: 55,        // for computing pricePerSqm when needed
    priceBreakdownTitle: 'Структура стоимости',
    priceBreakdown: [
      { label: 'Стоимость объекта', value: 12300000, type: 'currency', accent: true },
      { label: 'Первоначальный взнос (20%)', value: 2460000, type: 'currency', note: 'Рекомендация для одобрения ипотеки' },
      { label: 'Ежемесячный платёж (30 лет)', value: '≈ 54 300 ₽/мес', note: 'Расчёт при ставке 12% годовых' },
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
      { label: 'Этаж', value: '10 из 11' },
      { label: 'Балкон/Лоджия', value: 'Балкон' },
      { label: 'Отопление', value: 'Центральное' },

      { label: 'Общая площадь', value: '51 м²' },
      { label: 'Площадь балкона', value: '2,8 м²' },
      { label: 'Вид из окон', value: 'Во двор' },

      { label: 'Жилая площадь', value: '32 м²' },
      { label: 'Санузел', value: '1 совмещенный' },
      { label: 'Газ', value: 'Нет' },

      { label: 'Площадь кухни', value: '20 м²' },
      { label: 'Планировка', value: 'Изолированная' },
      { label: 'Ремонт', value: 'Косметический' },
    ],
    // About the building ("About the building" section) — 2x3 per the design
    building: [
      { label: 'Тип дома', value: 'Монолитно-кирпичный' },
      { label: 'Мусоропровод', value: 'Нет' },
      { label: 'Год постройки', value: '2014' },

      { label: 'Лифт', value: 'Грузовой' },
      { label: 'Новый дом', value: 'Да' },
    ],
    // Seller's description
    description: 'Продается квартира в самом центре города с шикарным видом на город. Просторная кухня-гостиная, большая спальная комната, совмещенный санузел. Во дворе ЖК имеется подземная парковка, видеонаблюдение, закрытая территория двора, 3 шлагбаума. В шаговой доступности 2 муниципальных детских сада, 1 частный детский сад, школа 14, детские кружки, салоны красоты, магазины, МТЦ "НОВЫЙ", клиника "Юнилаб", спортзал, зал единоборств. Обмен не интересует, только продажа.',
  };

  // Export to the global scope safely
  try { window.MP_MOCK = MP_MOCK; } catch (_) {}
})();
