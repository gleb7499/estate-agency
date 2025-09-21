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

  // Утилиты форматирования (общие)
  const fmtCurrency = (amount, currency = 'RUB') => {
    if (typeof amount !== 'number' || !isFinite(amount)) return '';
    try {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (_) {
      return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount) + ' ₽';
    }
  };
  const fmtNumber = (n) => {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    try { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n); } catch (_) { return String(n); }
  };

  // Делегированный клик по превью галереи — один обработчик на корне
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.mp-gallery__thumb');
    if (!btn || !root.contains(btn)) return;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const mainImg = gallery.querySelector('.mp-gallery__image');
    const full = btn.getAttribute('data-full');
    if (full && mainImg) {
      mainImg.src = full;
      gallery.querySelectorAll('.mp-gallery__thumb.is-active').forEach((el) => el.classList.remove('is-active'));
      btn.classList.add('is-active');
      MP.emit('mp:gallery:change', { src: full });
    }
  });

  // Рендер всей карточки по переданным данным
  const renderAll = (data) => {
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery || !data) return;

    // Заголовок и адрес
    const titleEl = gallery.querySelector('.mp-title');
    const addrEl = gallery.querySelector('.mp-address__text');
    if (titleEl) titleEl.textContent = data.name || '';
    if (addrEl) addrEl.textContent = data.address || '';

    // Главная фотка и превью
    const mainImg = gallery.querySelector('.mp-gallery__image');
    if (Array.isArray(data.photos) && data.photos.length) {
      if (mainImg) {
        mainImg.src = data.photos[0];
        try { mainImg.setAttribute('loading', 'eager'); } catch (_) {}
      }
      const thumbsWrap = gallery.querySelector('.mp-gallery__thumbs');
      if (thumbsWrap) {
        thumbsWrap.innerHTML = data.photos.map((src, i) => (
          `<button class="mp-gallery__thumb${i === 0 ? ' is-active' : ''}" type="button" role="listitem" aria-label="Фото ${i + 1}" data-full="${src}">
            <img src="${src}" alt="Превью ${i + 1}" loading="lazy">
          </button>`
        )).join('');
      }
    }

    // Факты
    const factsWrap = root.querySelector('#overview .mp-facts');
    if (factsWrap && Array.isArray(data.facts)) {
      const iconByIndex = [
        'assets/img/square.svg',
        'assets/img/living-area.svg',
        'assets/img/kitchen.svg',
        'assets/img/floor.svg',
        'assets/img/construction-year.svg',
      ];
      factsWrap.innerHTML = data.facts.map(({ label, value }, i) => (
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

    // Цена и цена за м²
    const priceEl = root.querySelector('.mp-overview__info .mp-price');
    const pricePerEl = root.querySelector('.mp-overview__info .mp-price-per');
    if (priceEl) {
      if (typeof data.currency === 'string') {
        try { priceEl.setAttribute('data-price-currency', data.currency); } catch(_) {}
      }
      if (typeof data.price === 'number') {
        priceEl.textContent = fmtCurrency(data.price, data.currency || 'RUB');
      }
    }
    if (pricePerEl) {
      let per = (typeof data.pricePerSqm === 'number') ? data.pricePerSqm : null;
      if (per == null && typeof data.price === 'number' && typeof data.totalAreaSqm === 'number' && data.totalAreaSqm > 0) {
        per = Math.round(data.price / data.totalAreaSqm);
      }
      if (typeof per === 'number') {
        pricePerEl.textContent = `${fmtNumber(per)} ₽/м²`;
      }
    }
  };

  // Инициализация: если данные уже глобально доступны — рендерим; иначе ждём события mp:data
  const initialData = (typeof window !== 'undefined' && window.MP_MOCK) ? window.MP_MOCK : null;
  if (initialData) renderAll(initialData);
  root.addEventListener('mp:data', (e) => { if (e && e.detail) renderAll(e.detail); });
})();
