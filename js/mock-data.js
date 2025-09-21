// Централизованные мок-данные для карточки объекта
// Без сетевых запросов; доступны глобально как window.MP_MOCK

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
    facts: [
      { label: 'Общая площадь', value: '55 м²' },
      { label: 'Жилая площадь', value: '32 м²' },
      { label: 'Кухня', value: '20 м²' },
      { label: 'Этаж', value: '2/4' },
      { label: 'Год постройки', value: '2014' },
    ],
    price: 12300000,         // в базовой валюте (RUB)
    currency: 'RUB',         // код валюты
    pricePerSqm: 223636,     // ₽/м², можно оставить null — посчитаем из цены и площади
    totalAreaSqm: 55,        // для вычисления pricePerSqm при необходимости
  };

  // Экспортируем в глобальную область безопасно
  try { window.MP_MOCK = MP_MOCK; } catch (_) {}
})();
