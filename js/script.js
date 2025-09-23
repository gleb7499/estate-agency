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

  // Модалка «Поделиться»: открыть по клику на кнопку в шапке и в подвале
  const openShareModal = () => {
    const modal = root.querySelector('.mp-share-modal');
    if (!modal) return;
    try {
      const href = window.location?.href || '';
      const box = modal.querySelector('.mp-share__input');
      if (box) box.textContent = href;
      // Обновляем QR в модалке
      try { updateQrImages('modal'); } catch (_) {}
    } catch (_) {}
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const closeShareModal = () => {
    const modal = root.querySelector('.mp-share-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  };
  root.addEventListener('click', (e) => {
    const headerShare = e.target.closest('.mp-header__right');
    const footerShare = e.target.closest('.mp-footer__content .mp-btn');
    if (headerShare || footerShare) {
      e.preventDefault();
      openShareModal();
      return;
    }
    const isClose = e.target.closest('[data-close="true"]');
    if (isClose) {
      // Закрыть любую открытую модалку
      closeShareModal();
      closeInterestModal();
      return;
    }
  });
  // Escape закрывает модалку
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeShareModal(); closeInterestModal(); }
  });
  // Кнопка «Скопировать»
  root.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.mp-share__copy-btn');
    if (!copyBtn) return;
    const modal = root.querySelector('.mp-share-modal');
    const box = modal?.querySelector('.mp-share__input');
    const text = box?.textContent?.trim() || window.location.href;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Скопировано';
      setTimeout(() => { copyBtn.textContent = 'Скопировать'; }, 1500);
    } catch (_) {
      // no-op
    }
  });

  // Кнопка «Печать» — печать страницы
  root.addEventListener('click', (e) => {
    const printBtn = e.target.closest('.mp-header__print');
    if (!printBtn) return;
    try { window.print(); } catch (_) {}
  });

  // Генерация QR через публичный энкодер (без JS-библиотек)
  const buildQrUrl = (data, sizePx = 160) => {
    const s = Math.max(32, Math.min(1024, Math.round(sizePx)));
    const encoded = encodeURIComponent(String(data || ''));
    return `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encoded}`;
  };
  const updateQrImages = (scope = 'all') => {
    const href = (typeof window !== 'undefined' && window.location) ? window.location.href : '';
    if (!href) return;
    if (scope === 'all' || scope === 'modal') {
      const modalQrImg = root.querySelector('.mp-share-modal .mp-share__qr img');
      if (modalQrImg) {
        modalQrImg.src = buildQrUrl(href, 157);
        modalQrImg.alt = 'QR код для обмена ссылкой';
      }
    }
    if (scope === 'all' || scope === 'footer') {
      const footerQrImg = root.querySelector('.mp-footer .mp-footer__qr-img');
      if (footerQrImg) {
        footerQrImg.src = buildQrUrl(href, 132);
        footerQrImg.alt = 'QR код для обмена ссылкой';
      }
    }
  };

  // Простая функция показа тоста
  const showToast = (message, ms = 1400) => {
    let toast = root.querySelector('.mp-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'mp-toast';
      root.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, ms);
  };

  // =================== Модалка «Оставить заявку» ===================
  const openInterestModal = () => {
    const modal = root.querySelector('.mp-interest-modal');
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    // фокус на поле телефона
    const phone = modal.querySelector('#mp-int-phone');
    if (phone) { try { phone.focus(); } catch (_) {} }
  };
  const closeInterestModal = () => {
    const modal = root.querySelector('.mp-interest-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  };
  // Открытие по клику на primary CTA внутри #overview
  root.addEventListener('click', (e) => {
    const primaryCta = e.target.closest('#overview .mp-contact-actions .mp-cta.mp-cta--primary');
    if (!primaryCta) return;
    e.preventDefault();
    openInterestModal();
  });
  // Простейшая валидация телефона: допустимы цифры + пробелы + ( ) + - , минимум 10 цифр
  const validatePhone = (value) => {
    if (typeof value !== 'string') return false;
    const digits = value.replace(/\D+/g, '');
    return digits.length >= 10; // РФ номера обычно 10-11 без кода страны
  };
  // Обработка submit формы
  root.addEventListener('submit', async (e) => {
    const form = e.target.closest('.mp-interest-form');
    if (!form) return;
    e.preventDefault();
    const phoneInput = form.querySelector('input[name="phone"]');
    const commentInput = form.querySelector('textarea[name="comment"]');
    const errBox = form.querySelector('.mp-field__error');
    const phone = phoneInput?.value?.trim() || '';
    const comment = commentInput?.value?.trim() || '';
    if (!validatePhone(phone)) {
      if (errBox) errBox.textContent = 'Введите корректный номер телефона';
      try { phoneInput?.focus(); } catch (_) {}
      return;
    }
    if (errBox) errBox.textContent = '';
    try {
      const payload = { phone, comment, objectId: root.querySelector('#overview')?.getAttribute('data-object-id') || null };
      const res = await MP.sendToServer('interest.submit', payload);
      if (res && res.ok) {
        closeInterestModal();
        MP.emit('mp:interest:submitted', payload);
      }
    } catch (_) {
      if (errBox) errBox.textContent = 'Не удалось отправить. Попробуйте позже';
    }
  });

  // При успешной отправке — заменить кнопки на статус «Объект заинтересовал»
  const renderInterestedState = () => {
    const overview = root.querySelector('#overview');
    const actions = root.querySelector('#overview .mp-overview__info .mp-contact-actions');
    if (!actions) return;
    // Если уже отрисовано — не повторяем
    if (overview?.getAttribute('data-interested') === 'true') return;
    actions.innerHTML = `
      <div class="mp-interest-state" role="status" aria-live="polite">
        <p class="mp-interest-state__title">Объект заинтересовал</p>
        <img class="mp-interest-state__icon" src="assets/img/interested.svg" alt="" aria-hidden="true" />
      </div>
    `;
    try { overview?.setAttribute('data-interested', 'true'); } catch (_) {}
  };
  root.addEventListener('mp:interest:submitted', renderInterestedState);

  
  // Маска телефона: +7 (XXX) XXX-XX-XX — лёгкая, без зависимостей
  const maskPhoneValue = (raw) => {
    if (typeof raw !== 'string') return '';
    let d = raw.replace(/\D+/g, '');
    if (!d) return '';
    // Приводим 8/9 к российскому формату +7
    if (d[0] === '9') d = '7' + d; // без кода страны, начинаем с оператора
    else if (d[0] === '8') d = '7' + d.slice(1);
    // Если не 7 — позволяем ввод других стран без форматирования
    if (d[0] !== '7') return `+${d.slice(0, 15)}`;
    const len = d.length;
    let res = '+7';
    if (len > 1) res += ' (' + d.slice(1, Math.min(4, len));
    if (len >= 4) res += ')';
    if (len > 4) res += ' ' + d.slice(4, Math.min(7, len));
    if (len >= 7) res += '-' + d.slice(7, Math.min(9, len));
    if (len >= 9) res += '-' + d.slice(9, Math.min(11, len));
    return res;
  };
  const applyPhoneMask = (inputEl) => {
    const formatted = maskPhoneValue(inputEl.value);
    inputEl.value = formatted;
    try { inputEl.setSelectionRange(formatted.length, formatted.length); } catch (_) {}
  };
  root.addEventListener('input', (e) => {
    const el = e.target.closest('#mp-int-phone');
    if (!el) return;
    applyPhoneMask(el);
  });
  root.addEventListener('paste', (e) => {
    const el = e.target.closest('#mp-int-phone');
    if (!el) return;
    setTimeout(() => applyPhoneMask(el), 0);
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

  // Копирование ID по клику на иконку в левом нижнем бейдже
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('.mp-gallery__badge--bl .mp-badge__copy');
    if (!btn) return;
    const wrap = btn.closest('.mp-gallery__badge--bl');
    const textEl = wrap?.querySelector('.mp-badge__text');
    const raw = textEl?.textContent || '';
    const match = raw.match(/\b(\d{1,})\b/);
    const idStr = match ? match[1] : '';
    if (!idStr) return;
    try {
      await navigator.clipboard.writeText(idStr);
      showToast('Скопировано!');
    } catch (_) {
      // Фолбэк: создаём временный input
      const tmp = document.createElement('input');
      tmp.value = idStr;
      tmp.style.position = 'fixed';
      tmp.style.opacity = '0';
      document.body.appendChild(tmp);
      tmp.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(tmp);
      showToast('Скопировано!');
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

  // Упрощаем: не грузим тяжёлый JS API Яндекс. Работаем через iframe + лёгкое геокодирование.

  // Инициализация карты: получаем координаты → вставляем iframe с точкой
  // Нормализация адреса: убираем квартиру/этаж/подъезд из строки, чтобы повысить шанс точного геокода
  const normalizeAddress = (addr) => {
    if (typeof addr !== 'string') return addr;
    let a = addr;
    a = a.replace(/\bкв\.?\s*\d+\b/gi, '');
    a = a.replace(/\bквартира\s*\d+\b/gi, '');
    a = a.replace(/\bподъезд\s*\d+\b/gi, '');
    a = a.replace(/\bэтаж\s*\d+\b/gi, '');
    // Частый формат корпуса: 117/1 → 117к1 (как отдаёт Яндекс)
    a = a.replace(/(\d+)\s*\/\s*(\d+)\b/g, '$1к$2');
    a = a.replace(/\s*,\s*,+/g, ','); // двойные запятые
    a = a.replace(/\s{2,}/g, ' ').trim();
    a = a.replace(/,\s*$/,'');
    return a;
  };
  
  // JSONP-геокодирование Яндекс (обходит CORS). Возвращает [lat, lng]
  const jsonpGeocode = (addr) => {
    const address = normalizeAddress(addr);
    if (!address) return Promise.reject(new Error('Нет адреса для JSONP-геокодирования'));
    return new Promise((resolve, reject) => {
      const cbName = `__mp_jsonp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const url = `https://geocode-maps.yandex.ru/1.x/?format=json&lang=ru_RU&geocode=${encodeURIComponent(address)}&callback=${cbName}`;
      const script = document.createElement('script');
      let timer = null;
      const cleanup = () => {
        try { delete window[cbName]; } catch (_) {}
        if (script && script.parentNode) script.parentNode.removeChild(script);
        clearTimeout(timer);
      };
      window[cbName] = (j) => {
        try {
          const members = j?.response?.GeoObjectCollection?.featureMember || [];
          if (!members.length) throw new Error('JSONP: адрес не найден');
          let best = null;
          for (const m of members) {
            const kind = m?.GeoObject?.metaDataProperty?.GeocoderMetaData?.kind;
            if (kind === 'house') { best = m; break; }
          }
          const obj = best || members[0];
          const pos = obj?.GeoObject?.Point?.pos;
          if (!pos) throw new Error('JSONP: нет координат');
          const [lonStr, latStr] = pos.split(' ');
          const lat = parseFloat(latStr); const lng = parseFloat(lonStr);
          if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error('JSONP: нераспознанные координаты');
          resolve([lat, lng]);
        } catch (err) { reject(err); }
        finally { cleanup(); }
      };
      script.onerror = () => { cleanup(); reject(new Error('JSONP: ошибка загрузки')); };
      script.src = url;
      script.async = true;
      document.head.appendChild(script);
      timer = setTimeout(() => { cleanup(); reject(new Error('JSONP: таймаут')); }, 8000);
    });
  };
  // Альтернативный геокодер (OSM Nominatim) — без ключа. Возвращает [lat, lng]
  const osmGeocode = (addr) => {
    const address = normalizeAddress(addr);
    if (!address) return Promise.reject(new Error('Нет адреса для OSM-геокодирования'));
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
    return fetch(url, { headers: { 'Accept-Language': 'ru' } })
      .then((r) => { if (!r.ok) throw new Error(`OSM HTTP ${r.status}`); return r.json(); })
      .then((arr) => {
        if (!Array.isArray(arr) || !arr.length) throw new Error('OSM: адрес не найден');
        const { lat, lon } = arr[0] || {};
        const plat = parseFloat(lat); const plng = parseFloat(lon);
        if (Number.isNaN(plat) || Number.isNaN(plng)) throw new Error('OSM: нераспознанные координаты');
        return [plat, plng];
      });
  };
  const initMap = (data) => {
    const container = root.querySelector('#mp-map');
    if (!container) return;
    const section = root.querySelector('#location');
    const addressAttr = (section && section.getAttribute('data-address') && section.getAttribute('data-address') !== '[TBD]')
      ? section.getAttribute('data-address')
      : null;
    const addressRaw = (data && typeof data.address === 'string') ? data.address : addressAttr;
    const address = normalizeAddress(addressRaw);
    // Пытаемся взять координаты из data-атрибутов (если интегратор их проставит)
    let lat = null; let lng = null;
    if (section) {
      const latAttr = section.getAttribute('data-lat');
      const lngAttr = section.getAttribute('data-lng');
      if (latAttr && lngAttr && latAttr !== '[TBD]' && lngAttr !== '[TBD]') {
        const latNum = Number(latAttr);
        const lngNum = Number(lngAttr);
        if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) { lat = latNum; lng = lngNum; }
      }
    }
    if (!address && (lat == null || lng == null)) return;

    const buildIframeWithPoint = (plat, plng) => {
      const src = `https://yandex.ru/map-widget/v1/?ll=${plng},${plat}&z=16&pt=${plng},${plat},pm2rdm`;
      container.innerHTML = `<iframe title="Карта" src="${src}" style="border:0;width:100%;height:100%" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    };

    // 1) если координаты заданы — рисуем сразу
    if (lat != null && lng != null) { buildIframeWithPoint(lat, lng); return; }

    // 2) есть адрес — JSONP Яндекс → OSM → в крайнем случае поиск (может показать "1 найден")
    jsonpGeocode(address)
      .then(([plat, plng]) => buildIframeWithPoint(plat, plng))
      .catch(() => osmGeocode(address)
        .then(([plat, plng]) => buildIframeWithPoint(plat, plng))
        .catch(() => {
          const q = encodeURIComponent(address || '');
          const src = `https://yandex.ru/map-widget/v1/?text=${q}&z=16`;
          container.innerHTML = `<iframe title="Карта" src="${src}" style="border:0;width:100%;height:100%" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
        })
      );
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
      updateGalleryNavVisibility();
    }
  });

  // Кнопка «следующее фото» на текущем изображении
  root.addEventListener('click', (e) => {
    const nextBtn = e.target.closest('.mp-gallery__next');
    if (!nextBtn) return;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const thumbsWrap = gallery.querySelector('.mp-gallery__thumbs');
    if (!thumbsWrap) return;
    const thumbs = Array.from(thumbsWrap.querySelectorAll('.mp-gallery__thumb'));
    if (!thumbs.length) return;
    const currentIndex = thumbs.findIndex((t) => t.classList.contains('is-active'));
    const nextIndex = Math.min((currentIndex >= 0 ? currentIndex + 1 : 1), thumbs.length - 1);
    // клик по следующему превью — переиспользуем имеющуюся логику
    thumbs[nextIndex].click();
  });

  // Кнопка «предыдущее фото»
  root.addEventListener('click', (e) => {
    const prevBtn = e.target.closest('.mp-gallery__prev');
    if (!prevBtn) return;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const thumbsWrap = gallery.querySelector('.mp-gallery__thumbs');
    if (!thumbsWrap) return;
    const thumbs = Array.from(thumbsWrap.querySelectorAll('.mp-gallery__thumb'));
    if (!thumbs.length) return;
    const currentIndex = thumbs.findIndex((t) => t.classList.contains('is-active'));
    const prevIndex = Math.max((currentIndex >= 0 ? currentIndex - 1 : 0), 0);
    thumbs[prevIndex].click();
  });

  // Показываем/скрываем стрелки на первом/последнем фото
  const updateGalleryNavVisibility = () => {
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const thumbs = Array.from(gallery.querySelectorAll('.mp-gallery__thumbs .mp-gallery__thumb'));
    const prevBtn = gallery.querySelector('.mp-gallery__prev');
    const nextBtn = gallery.querySelector('.mp-gallery__next');
    if (!thumbs.length) {
      if (prevBtn) prevBtn.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
      return;
    }
    const currentIndex = thumbs.findIndex((t) => t.classList.contains('is-active'));
    const isFirst = currentIndex <= 0;
    const isLast = currentIndex >= thumbs.length - 1;
    if (prevBtn) prevBtn.hidden = isFirst;
    if (nextBtn) nextBtn.hidden = isLast;
  };
  // Обновляем видимость при изменении галереи
  root.addEventListener('mp:gallery:change', updateGalleryNavVisibility);
  // И при первичном рендере данных
  root.addEventListener('mp:data', () => setTimeout(updateGalleryNavVisibility, 0));

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
      // Обновляем бейдж количества фото
      const badge = gallery.querySelector('.mp-gallery__badge .mp-badge__text');
      if (badge) badge.textContent = `${data.photos.length} фото`;
    }

    // Бейдж с ID (внизу слева): берём из параметра id в URL
    try {
      const url = new URL(window.location.href);
      const objectId = url.searchParams.get('id');
      const idBadge = gallery.querySelector('.mp-gallery__badge--bl');
      if (idBadge) {
        const textSpan = idBadge.querySelector('.mp-badge__text');
        if (objectId && /^\d{1,}$/.test(objectId)) {
          if (textSpan) textSpan.textContent = `ID ${objectId}`;
          idBadge.hidden = false;
        } else {
          idBadge.hidden = true;
        }
      }
    } catch (_) { /* no-op */ }

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

    // Условия сделки (2x2 сетка)
    const termsWrap = root.querySelector('.mp-terms__grid');
    if (termsWrap) {
      const t = data.terms || {};
      const yesNo = (v) => (v ? 'Да' : 'Нет');
      const items = [
        { label: 'Тип продажи', value: t.saleType ?? '' },
        { label: 'Продается впервые', value: (t.firstSale != null) ? yesNo(!!t.firstSale) : '' },
        { label: 'Онлайн показ', value: (t.onlineViewing != null) ? yesNo(!!t.onlineViewing) : '' },
        { label: 'Ипотека', value: (t.mortgage != null) ? yesNo(!!t.mortgage) : '' },
      ];
      termsWrap.innerHTML = items.map(({ label, value }) => (
        `<li class="mp-terms__item">
          <span class="mp-terms__label">${label}</span>
          <span class="mp-terms__value">${value}</span>
        </li>`
      )).join('');
    }

    // Об объекте (4x3)
    const aboutWrap = root.querySelector('.mp-about__grid');
    if (aboutWrap && Array.isArray(data.about)) {
      aboutWrap.innerHTML = data.about.map(({ label, value }) => (
        `<li class="mp-about__item">
          <span class="mp-about__label">${label}</span>
          <span class="mp-about__value">${value}</span>
        </li>`
      )).join('');
    }

    // О здании (2x3)
    const buildingWrap = root.querySelector('.mp-building__grid');
    if (buildingWrap && Array.isArray(data.building)) {
      buildingWrap.innerHTML = data.building.map(({ label, value }) => (
        `<li class="mp-building__item">
          <span class="mp-building__label">${label}</span>
          <span class="mp-building__value">${value}</span>
        </li>`
      )).join('');
    }

    // Описание (plain text)
    const descEl = root.querySelector('.mp-description__text');
    if (descEl && typeof data.description === 'string') {
      descEl.textContent = data.description;
    }

    // Расположение: инициализируем карту
    try { initMap(data); } catch (err) { /* no-op */ }
  };

  // Инициализация: если данные уже глобально доступны — рендерим; иначе ждём события mp:data
  const initialData = (typeof window !== 'undefined' && window.MP_MOCK) ? window.MP_MOCK : null;
  if (initialData) {
    renderAll(initialData);
    // после первичного рендера сразу скорректируем видимость стрелок
    setTimeout(() => {
      try { updateGalleryNavVisibility(); } catch (_) {}
    }, 0);
    // Инициализация QR картинок
    try { updateQrImages('all'); } catch (_) {}
  }
  root.addEventListener('mp:data', (e) => { if (e && e.detail) renderAll(e.detail); });
})();
