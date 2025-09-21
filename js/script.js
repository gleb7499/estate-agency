// Базовый скрипт (без плейсхолдер-логов), изолированный от глобальной области
(() => {
  const root = document.querySelector('.mp-root');
  if (!root) return;

  // Контракт: мок-отправка на сервер — не делает сетевых запросов
  const MP = {
    sendToServer(action, payload) {
      // мок: логируем; интегратор заменит на AJAX
      // eslint-disable-next-line no-console
      console.debug('[MP.sendToServer]', action, payload);
      return Promise.resolve({ ok: true });
    },
    emit(name, detail) {
      root.dispatchEvent(new CustomEvent(name, { detail }));
    },
  };

  // Пример: клик по кнопке «Отправить ссылку»
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.mp-btn');
    if (!btn) return;
    MP.emit('mp:share:click', { ts: Date.now() });
  });

  // Навигация по секциям (если появятся ссылки с href="#id")
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = root.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Галерея: смена главного изображения по клику на превью
  const gallery = root.querySelector('.mp-gallery');
  if (gallery) {
    // Мок-данные объекта (локальные, без сетевых запросов)
    const mockData = {
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
      price: '12 300 000 ₽',
    };

    // Рендер заголовка и адреса
    const titleEl = gallery.querySelector('.mp-title');
  const addrEl = gallery.querySelector('.mp-address__text');
    if (titleEl) titleEl.textContent = mockData.name;
  if (addrEl) addrEl.textContent = mockData.address;

    // Рендер главного фото и превью
    const mainImg = gallery.querySelector('.mp-gallery__image');
    if (mockData.photos?.length) {
      if (mainImg) {
        mainImg.src = mockData.photos[0];
        try { mainImg.setAttribute('loading', 'eager'); } catch (_) {}
      }
      const thumbsWrap = gallery.querySelector('.mp-gallery__thumbs');
      if (thumbsWrap) {
        thumbsWrap.innerHTML = mockData.photos.map((src, i) => (
          `<button class="mp-gallery__thumb${i === 0 ? ' is-active' : ''}" type="button" role="listitem" aria-label="Фото ${i + 1}" data-full="${src}">
            <img src="${src}" alt="Превью ${i + 1}" loading="lazy">
          </button>`
        )).join('');
      }
    }

    // Рендер характеристик (без пункта «Комнат» по заданию)
    const factsWrap = gallery.querySelector('.mp-facts');
    if (factsWrap) {
      const iconByIndex = [
        'assets/img/square.svg',              // 1: Общая площадь
        'assets/img/living-area.svg',         // 2: Жилая площадь
        'assets/img/kitchen.svg',             // 3: Кухня
        'assets/img/floor.svg',               // 4: Этаж
        'assets/img/construction-year.svg',   // 5: Год постройки
      ];
      factsWrap.innerHTML = mockData.facts.map(({ label, value }, i) => (
        `<li class="mp-fact">
          <span class="mp-fact__icon" aria-hidden="true">${iconByIndex[i] ? `<img src="${iconByIndex[i]}" alt="" aria-hidden="true">` : ''}</span>
          <div class="mp-fact__text">
            <div class="mp-fact__label">${label}</div>
            <div class="mp-fact__value">${value}</div>
          </div>
        </li>`
      )).join('');

      factsWrap.querySelectorAll('.mp-fact__icon img').forEach((img) => {
        img.addEventListener('error', () => { img.remove(); });
      });
    }

    // Цена в правой колонке (если есть)
    const priceEl = root.querySelector('.mp-overview__info .mp-price');
    if (priceEl) priceEl.textContent = mockData.price;

    gallery.addEventListener('click', (e) => {
      const btn = e.target.closest('.mp-gallery__thumb');
      if (!btn) return;
      const full = btn.getAttribute('data-full');
      if (full && mainImg) {
        mainImg.src = full;
        // активное превью
        gallery.querySelectorAll('.mp-gallery__thumb.is-active').forEach((el) => el.classList.remove('is-active'));
        btn.classList.add('is-active');
        // эмитим событие для интегратора
        MP.emit('mp:gallery:change', { src: full });
      }
    });
  }
})();
