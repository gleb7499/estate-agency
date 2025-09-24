// Базовый скрипт (без плейсхолдер-логов), изолированный от глобальной области
(() => {
  const root = document.querySelector('.mp-root');
  if (!root) return;
  // Храним последний набор данных для повторной инициализации карты при печати
  let __mp_currentData = null;

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
      try { closePhotoModal(); } catch (_) {}
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
    // Перед печатью готовим карту и по возможности ждём готовности статичного изображения
    try { prepareMapForPrint(); } catch (_) {}
    const container = root.querySelector('#mp-map');
    const img = container?.querySelector('img.mp-map__print');
    const waitReady = (cb) => {
      const timeout = Date.now() + 1200;
      const tick = () => {
        if (!img || img.complete || img.naturalWidth > 0 || Date.now() > timeout) { cb(); return; }
        setTimeout(tick, 50);
      };
      tick();
    };
    waitReady(() => { try { window.print(); } catch (_) {} });
  });

  // Генерация QR через публичный энкодер (без JS-библиотек)
  const buildQrUrl = (data, sizePx = 160) => {
    const s = Math.max(32, Math.min(1024, Math.round(sizePx)));
    const encoded = encodeURIComponent(String(data || ''));
    return `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encoded}`;
  };
  // Построение URL статического изображения карты (Yandex Static Maps)
  const buildStaticMapUrl = ({ lat, lng, zoom = 16, size = [600, 400] }) => {
    const [w, h] = size;
    // Ограничения API по размеру: подберём безопасные дефолты
    const width = Math.max(200, Math.min(650, Math.round(w)));
    const height = Math.max(200, Math.min(650, Math.round(h)));
    // Маркер красный (pm2rdm)
    return `https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&z=${zoom}&size=${width},${height}&pt=${lng},${lat},pm2rdm&l=map`;
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

    const buildIframeWithPoint = (plat, plng, eager = false) => {
      const src = `https://yandex.ru/map-widget/v1/?ll=${plng},${plat}&z=16&pt=${plng},${plat},pm2rdm`;
      const loading = eager ? 'eager' : 'lazy';
      container.innerHTML = `<iframe title="Карта" src="${src}" style="border:0;width:100%;height:100%" loading="${loading}" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  // Обновим/создадим статичную картинку для печати
  const img = container.querySelector('img.mp-map__print') || (() => { const i = document.createElement('img'); i.className = 'mp-map__print'; container.appendChild(i); return i; })();
      try { img.alt = 'Карта'; } catch (_) {}
      try { img.decoding = 'sync'; img.loading = 'eager'; } catch (_) {}
  try { img.src = buildStaticMapUrl({ lat: plat, lng: plng, size: [container.clientWidth || 600, container.clientHeight || 400] }); container.classList.add('has-print-map'); } catch (_) {}
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
          // Нет точных координат — статичную карту формируем без маркера (просто по центру текста не поддерживается API), оставляем только iframe для печати
          const img = container.querySelector('img.mp-map__print') || (() => { const i = document.createElement('img'); i.className = 'mp-map__print'; container.appendChild(i); return i; })();
          try { img.removeAttribute('src'); } catch (_) {}
        })
      );
  };

  // Перед печатью гарантируем, что карта отрисована и не «ленивая»
  const prepareMapForPrint = () => {
    const container = root.querySelector('#mp-map');
    if (!container) return;
  // Если iframe ещё не вставлен — вставим быстрый поисковый вариант по адресу
    let iframe = container.querySelector('iframe');
    if (!iframe) {
      // Попытка взять адрес из данных/DOM
      const addrFromData = (__mp_currentData && __mp_currentData.address) || '';
      const addrFromDom = (root.querySelector('.mp-gallery .mp-address__text')?.textContent || '').trim();
      const address = addrFromData || addrFromDom || '';
      if (address) {
        const q = encodeURIComponent(address);
        const src = `https://yandex.ru/map-widget/v1/?text=${q}&z=16`;
        container.innerHTML = `<iframe title="Карта" src="${src}" style="border:0;width:100%;height:100%" loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
        // Попробуем создать статичную картинку, если известны координаты из секции
        const section = root.querySelector('#location');
        const latAttr = section?.getAttribute('data-lat');
        const lngAttr = section?.getAttribute('data-lng');
        const latNum = latAttr && latAttr !== '[TBD]' ? Number(latAttr) : null;
        const lngNum = lngAttr && lngAttr !== '[TBD]' ? Number(lngAttr) : null;
        if (latNum != null && !Number.isNaN(latNum) && lngNum != null && !Number.isNaN(lngNum)) {
          const img = document.createElement('img');
          img.className = 'mp-map__print';
          try { img.alt = 'Карта'; img.decoding = 'sync'; img.loading = 'eager'; } catch (_) {}
          try { img.src = buildStaticMapUrl({ lat: latNum, lng: lngNum, size: [container.clientWidth || 600, container.clientHeight || 400] }); container.classList.add('has-print-map'); } catch (_) {}
          container.appendChild(img);
        }
        iframe = container.querySelector('iframe');
      } else {
        // Если адрес недоступен, пробуем стандартную инициализацию
        try { initMap(__mp_currentData); } catch (_) {}
      }
    }
    // Принудительно выключаем lazy-загрузку и перезапускаем загрузку
    if (iframe) {
      try { iframe.setAttribute('loading', 'eager'); } catch (_) {}
      try { iframe.src = iframe.src; } catch (_) {}
    }
    // Убедимся, что статичное изображение карты готово — подождём недолго
    const img = container.querySelector('img.mp-map__print');
    if (img && !img.complete) {
      try {
        const t0 = Date.now();
        const done = (cb) => {
          if (img.complete || img.naturalWidth > 0 || Date.now() - t0 > 1500) cb();
          else setTimeout(() => done(cb), 60);
        };
        // Печать вызовется внешним кодом, тут мы лишь стараемся успеть прогрузить
        done(() => {});
      } catch (_) {}
    }
  };

  // Делегированный клик по превью галереи — один обработчик на корне
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.mp-gallery__thumb');
    if (!btn || !root.contains(btn)) return;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const mainImg = gallery.querySelector('.mp-gallery__image');
    const full = btn.getAttribute('data-full');
    const isVideo = btn.getAttribute('data-type') === 'video';
    if (full && mainImg) {
      mainImg.src = full;
      // обновим фон-блюр для квадратной области
      const mainWrap = gallery.querySelector('.mp-gallery__main');
      if (mainWrap) {
        try {
          mainWrap.style.setProperty('--mp-gallery-bg', `url("${full}")`);
          mainWrap.style.backgroundImage = `url('${full}')`;
          mainWrap.style.backgroundSize = 'cover';
          mainWrap.style.backgroundPosition = 'center';
          // Фолбэк-фоновый <img> с блюром
          let bg = mainWrap.querySelector('img.mp-gallery__bg');
          if (!bg) {
            bg = document.createElement('img');
            bg.className = 'mp-gallery__bg';
            bg.alt = '';
            bg.setAttribute('aria-hidden', 'true');
            mainWrap.insertBefore(bg, mainWrap.firstChild);
          }
          bg.src = full;
        } catch (_) {}
      }
      // показываем кнопку play только на видео-кадре
      const playBtn = gallery.querySelector('.mp-gallery__play');
      if (playBtn) playBtn.hidden = !isVideo;
      gallery.querySelectorAll('.mp-gallery__thumb.is-active').forEach((el) => el.classList.remove('is-active'));
      btn.classList.add('is-active');
      MP.emit('mp:gallery:change', { src: full, type: isVideo ? 'video' : 'photo' });
      updateGalleryNavVisibility();
    }
  });

  // =================== Лайтбокс фотографий ===================
  const openPhotoModal = () => {
    const modal = root.querySelector('.mp-photo-modal');
    const gallery = root.querySelector('.mp-gallery');
    if (!modal || !gallery) return;
    // Заголовок
    const title = (gallery.querySelector('.mp-title')?.textContent || '').trim();
    const titleEl = modal.querySelector('.mp-photo__title');
    if (titleEl) titleEl.textContent = title;
    // Кнопка «Позвонить» — используем номер из карточки агента, если есть
    const phoneLink = root.querySelector('.mp-agent .mp-agent__phone');
    const callBtn = modal.querySelector('.mp-photo__call');
    if (callBtn) {
      const href = phoneLink?.getAttribute('href') || '#';
      callBtn.setAttribute('href', href);
    }
    // Список превью (в галерее) и активный индекс — исключаем видео
    const allThumbs = Array.from(gallery.querySelectorAll('.mp-gallery__thumbs .mp-gallery__thumb'));
    const photoThumbs = allThumbs.filter((t) => t.getAttribute('data-type') !== 'video');
    const activePhotoIndex = Math.max(0, photoThumbs.findIndex((t) => t.classList.contains('is-active')));
    // Если активен видео-элемент, в модалку подставим первую фотографию
    const activeIsVideo = !!allThumbs.find((t) => t.classList.contains('is-active') && t.getAttribute('data-type') === 'video');
    const mainSrc = activeIsVideo
      ? (photoThumbs[0]?.getAttribute('data-full') || photoThumbs[0]?.querySelector('img')?.getAttribute('src') || '')
      : (gallery.querySelector('.mp-gallery__image')?.getAttribute('src') || '');
    const img = modal.querySelector('.mp-photo__image');
    if (img && mainSrc) img.src = mainSrc;
    // Превью в модалке
    const thumbsWrap = modal.querySelector('.mp-photo__thumbs');
    if (thumbsWrap) {
      if (photoThumbs.length) {
        thumbsWrap.innerHTML = photoThumbs.map((t, i) => {
          const src = t.querySelector('img')?.getAttribute('src') || t.getAttribute('data-full') || '';
          return `<button class="mp-gallery__thumb${i === activePhotoIndex ? ' is-active' : ''}" type="button" data-full="${src}"><img src="${src}" alt="Превью ${i + 1}"></button>`;
        }).join('');
      } else {
        // Фолбэк — если нет миниатюр, но есть основной src
        thumbsWrap.innerHTML = mainSrc ? `<button class="mp-gallery__thumb is-active" type="button" data-full="${mainSrc}"><img src="${mainSrc}" alt="Превью"></button>` : '';
      }
    }
    updatePhotoNavVisibility();
    // Прокрутить миниатюры так, чтобы активная была видна
    try {
      const activeThumb = modal.querySelector('.mp-photo__thumbs .mp-gallery__thumb.is-active');
      activeThumb?.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
    } catch (_) {}
    // Показать модалку
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    try { modal.querySelector('.mp-photo__image')?.focus?.(); } catch (_) {}
  };
  const closePhotoModal = () => {
    const modal = root.querySelector('.mp-photo-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  };

  // Открытие: клик по текущей фотографии (не по стрелкам/бейджам)
  root.addEventListener('click', (e) => {
    if (e.target.closest('.mp-gallery__play')) return; // не открывать фото, если клик по play
    const img = e.target.closest('.mp-gallery__main .mp-gallery__image');
    if (!img) return;
    e.preventDefault();
    const gallery = root.querySelector('.mp-gallery');
    const activeThumb = gallery?.querySelector('.mp-gallery__thumb.is-active');
    const isVideoActive = activeThumb?.getAttribute('data-type') === 'video';
    if (isVideoActive) {
      const src = activeThumb.getAttribute('data-video') || gallery?.getAttribute('data-video') || '';
      openVideoModal(src);
    } else {
      openPhotoModal();
    }
  });

  // =================== Видео: открытие/закрытие модалки ===================
  const openVideoModal = (src) => {
    const modal = root.querySelector('.mp-video-modal');
    if (!modal) return;
    const video = modal.querySelector('.mp-video__el');
    const title = modal.querySelector('#mp-video-modal-title');
    const pageTitle = (root.querySelector('.mp-gallery .mp-title')?.textContent || '').trim();
    if (title) title.textContent = pageTitle ? `Видео — ${pageTitle}` : 'Видео';
    if (video) {
      try { video.src = src || ''; } catch (_) { /* noop */ }
      try { video.currentTime = 0; } catch (_) {}
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const closeVideoModal = () => {
    const modal = root.querySelector('.mp-video-modal');
    if (!modal) return;
    const video = modal.querySelector('.mp-video__el');
    modal.hidden = true;
    document.body.style.overflow = '';
    // Останавливаем и очищаем источник
    if (video) {
      try { video.pause(); } catch (_) {}
      try { video.removeAttribute('src'); video.load?.(); } catch (_) {}
    }
  };
  // Кнопка play на главном фото
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.mp-gallery__play');
    if (!btn) return;
    e.preventDefault();
    // Источник видео: data-video на кнопке или на .mp-gallery, далее фолбэк (пусто)
    const gallery = root.querySelector('.mp-gallery');
    const src = btn.getAttribute('data-video')
      || gallery?.getAttribute('data-video')
      || '';
    openVideoModal(src);
  });
  // Закрытие видео по overlay/крестику уже обрабатывается общим обработчиком; добавим явный вызов
  root.addEventListener('click', (e) => {
    const isClose = e.target.closest('.mp-video-modal [data-close="true"]');
    if (!isClose) return;
    closeVideoModal();
  });
  // ESC закрывает видео
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeVideoModal(); });
  // Навигация внутри лайтбокса
  root.addEventListener('click', (e) => {
    const prev = e.target.closest('.mp-photo-modal .mp-photo__prev');
    const next = e.target.closest('.mp-photo-modal .mp-photo__next');
    if (!prev && !next) return;
    const modal = root.querySelector('.mp-photo-modal');
    if (!modal || modal.hidden) return;
    const thumbs = Array.from(modal.querySelectorAll('.mp-photo__thumbs .mp-gallery__thumb'));
    if (!thumbs.length) return;
    const idx = Math.max(0, thumbs.findIndex((t) => t.classList.contains('is-active')));
    const target = next ? Math.min(idx + 1, thumbs.length - 1) : Math.max(idx - 1, 0);
    if (thumbs[target]) thumbs[target].click();
  });
  // Клик по миниатюре внутри лайтбокса
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.mp-photo-modal .mp-photo__thumbs .mp-gallery__thumb');
    if (!btn) return;
    const modal = root.querySelector('.mp-photo-modal');
    const img = modal?.querySelector('.mp-photo__image');
    const src = btn.getAttribute('data-full') || btn.querySelector('img')?.getAttribute('src');
    if (img && src) img.src = src;
    btn.parentElement?.querySelectorAll('.mp-gallery__thumb.is-active').forEach((el) => el.classList.remove('is-active'));
    btn.classList.add('is-active');
    updatePhotoNavVisibility();
    try { btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch (_) {}
  });
  // Закрытие по Esc дополнительно
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closePhotoModal(); return; }
    const modal = root.querySelector('.mp-photo-modal');
    if (!modal || modal.hidden) return;
    if (e.key === 'ArrowRight') {
      const next = modal.querySelector('.mp-photo__next');
      next?.click();
    } else if (e.key === 'ArrowLeft') {
      const prev = modal.querySelector('.mp-photo__prev');
      prev?.click();
    }
  });
  // Клик по оверлею обрабатывается общим обработчиком data-close="true" выше

  function updatePhotoNavVisibility() {
    const modal = root.querySelector('.mp-photo-modal');
    if (!modal || modal.hidden) return;
    const thumbs = Array.from(modal.querySelectorAll('.mp-photo__thumbs .mp-gallery__thumb'));
    const prevBtn = modal.querySelector('.mp-photo__prev');
    const nextBtn = modal.querySelector('.mp-photo__next');
    if (!thumbs.length) { if (prevBtn) prevBtn.hidden = true; if (nextBtn) nextBtn.hidden = true; return; }
    const idx = Math.max(0, thumbs.findIndex((t) => t.classList.contains('is-active')));
    const isFirst = idx <= 0; const isLast = idx >= thumbs.length - 1;
    if (prevBtn) prevBtn.hidden = isFirst;
    if (nextBtn) nextBtn.hidden = isLast;
  }

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
  // Синхронизируем активное состояние индикаторов при смене фото
  root.addEventListener('mp:gallery:change', () => {
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const thumbs = Array.from(gallery.querySelectorAll('.mp-gallery__thumbs .mp-gallery__thumb'));
    const activeIndex = Math.max(0, thumbs.findIndex((t) => t.classList.contains('is-active')));
    const indicators = Array.from(gallery.querySelectorAll('.mp-gallery__indicator'));
    indicators.forEach((el, i) => {
      const on = i === activeIndex;
      el.classList.toggle('is-active', on);
      try { el.setAttribute('aria-current', on ? 'true' : 'false'); } catch (_) {}
    });
  });

  // Клик по индикатору → переключение фото
  root.addEventListener('click', (e) => {
    const ind = e.target.closest('.mp-gallery__indicator');
    if (!ind) return;
    const idx = Number(ind.getAttribute('data-index')) || 0;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const thumbs = Array.from(gallery.querySelectorAll('.mp-gallery__thumbs .mp-gallery__thumb'));
    if (thumbs[idx]) thumbs[idx].click();
  });
  // И при первичном рендере данных
  root.addEventListener('mp:data', () => setTimeout(updateGalleryNavVisibility, 0));

  // Рендер всей карточки по переданным данным
  const renderAll = (data) => {
    __mp_currentData = data || __mp_currentData;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery || !data) return;

    // Заголовок и адрес
    const titleEl = gallery.querySelector('.mp-title');
    const addrEl = gallery.querySelector('.mp-address__text');
    if (titleEl) titleEl.textContent = data.name || '';
    if (addrEl) addrEl.textContent = data.address || '';

    // Главная фотка/видео и превью
    const mainImg = gallery.querySelector('.mp-gallery__image');
    const playBtn = gallery.querySelector('.mp-gallery__play');
    const videoSrc = (typeof data.video === 'string' && data.video.trim()) ? data.video.trim() : (gallery.getAttribute('data-video') || '').trim();
    const hasPhotos = Array.isArray(data.photos) && data.photos.length;
    const hasVideo = !!videoSrc;
    
    // Функция для извлечения постера из видео
    const extractVideoPoster = (videoUrl, callback) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true; // обязательно для автовоспроизведения
      video.currentTime = 1.5; // берём кадр с 1.5 секунды
      
      video.addEventListener('loadeddata', () => {
        try {
          // Пробуем извлечь через Canvas
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const posterUrl = canvas.toDataURL('image/jpeg', 0.8);
          callback(posterUrl);
        } catch (err) {
          console.warn('Canvas extraction failed, trying video poster approach:', err);
          // Фолбэк: используем сам видео элемент как источник
          callback(videoUrl + '#t=1'); // URL с тайм-кодом для постера
        }
      });
      
      video.addEventListener('error', (e) => {
        console.warn('Ошибка загрузки видео для постера:', e);
        callback(hasPhotos ? data.photos[0] : ''); // финальный фолбэк
      });
      
      // Тайм-аут на случай долгой загрузки
      setTimeout(() => {
        if (video.readyState < 2) { // если видео не загрузилось за 3 сек
          callback(hasPhotos ? data.photos[0] : '');
        }
      }, 3000);
      
      video.src = videoUrl;
    };

    if (hasPhotos || hasVideo) {
      // Установить основной кадр
      if (mainImg) {
        if (hasVideo) {
          // Временно устанавливаем фолбэк, пока извлекаем постер из видео
          const fallbackPoster = hasPhotos ? data.photos[0] : '';
          mainImg.src = fallbackPoster;
          
          // Извлекаем настоящий постер из видео
          extractVideoPoster(videoSrc, (posterUrl) => {
            if (posterUrl && mainImg) {
              mainImg.src = posterUrl;
              // Обновляем фон тоже
              const mainWrap = gallery.querySelector('.mp-gallery__main');
              if (mainWrap) {
                try {
                  mainWrap.style.setProperty('--mp-gallery-bg', `url("${posterUrl}")`);
                  mainWrap.style.backgroundImage = `url('${posterUrl}')`;
                  const bg = mainWrap.querySelector('img.mp-gallery__bg');
                  if (bg) bg.src = posterUrl;
                } catch (_) {}
              }
              // Обновляем превью видео в карусели
              const videoThumb = gallery.querySelector('.mp-gallery__thumb[data-type="video"]');
              if (videoThumb) {
                const thumbImg = videoThumb.querySelector('img');
                if (thumbImg) thumbImg.src = posterUrl;
                videoThumb.setAttribute('data-full', posterUrl);
              }
            }
          });
        } else {
          mainImg.src = data.photos[0];
        }
        try { mainImg.setAttribute('loading', 'eager'); } catch (_) {}
        
        // Настройка фона (будет обновлена асинхронно для видео)
        const mainWrap = gallery.querySelector('.mp-gallery__main');
        if (mainWrap) {
          const initialBgSrc = hasVideo ? (hasPhotos ? data.photos[0] : '') : data.photos[0];
          try {
            mainWrap.style.setProperty('--mp-gallery-bg', `url("${initialBgSrc}")`);
            mainWrap.style.backgroundImage = `url('${initialBgSrc}')`;
            mainWrap.style.backgroundSize = 'cover';
            mainWrap.style.backgroundPosition = 'center';
            let bg = mainWrap.querySelector('img.mp-gallery__bg');
            if (!bg) {
              bg = document.createElement('img');
              bg.className = 'mp-gallery__bg';
              bg.alt = '';
              bg.setAttribute('aria-hidden', 'true');
              mainWrap.insertBefore(bg, mainWrap.firstChild);
            }
            bg.src = initialBgSrc;
          } catch (_) {}
        }
      }
      // Видимость и источник play-кнопки: показываем только при загрузке, если первым идёт видео
      if (playBtn) {
        playBtn.hidden = !hasVideo; // при загрузке: если есть видео, показываем (так как первым будет видео)
        if (hasVideo) playBtn.setAttribute('data-video', videoSrc); else playBtn.removeAttribute('data-video');
      }
      // Собираем превью: сначала видео (если есть), затем фото
      const thumbsWrap = gallery.querySelector('.mp-gallery__thumbs');
      if (thumbsWrap) {
        const parts = [];
        if (hasVideo) {
          const thumbPosterFallback = hasPhotos ? data.photos[0] : '';
          parts.push(
            `<button class="mp-gallery__thumb is-active" type="button" role="listitem" aria-label="Видео" data-type="video" data-video="${videoSrc}" data-full="${thumbPosterFallback}">
              <img src="${thumbPosterFallback}" alt="Видео превью" loading="lazy">
            </button>`
          );
        }
        if (hasPhotos) {
          parts.push(
            data.photos.map((src, i) => (
              `<button class="mp-gallery__thumb${!hasVideo && i === 0 ? ' is-active' : ''}" type="button" role="listitem" aria-label="Фото ${i + 1}" data-full="${src}">
                <img src="${src}" alt="Превью ${i + 1}" loading="lazy">
              </button>`
            )).join('')
          );
        }
        thumbsWrap.innerHTML = parts.join('');
      }
      // Индикаторы карусели (мобайл): создаём/обновляем
      let indicators = gallery.querySelector('.mp-gallery__indicators');
      if (!indicators) {
        indicators = document.createElement('div');
        indicators.className = 'mp-gallery__indicators';
        const main = gallery.querySelector('.mp-gallery__main');
        if (main && main.parentNode) {
          main.parentNode.insertBefore(indicators, main.nextSibling);
        } else {
          gallery.appendChild(indicators);
        }
      }
      const totalItems = (hasPhotos ? data.photos.length : 0) + (hasVideo ? 1 : 0);
      indicators.innerHTML = Array.from({ length: totalItems }).map((_, i) => (
        `<button type="button" class="mp-gallery__indicator${i === 0 ? ' is-active' : ''}" aria-label="Показать элемент ${i + 1}" data-index="${i}"></button>`
      )).join('');
      // Обновляем бейдж количества (включая видео)
      const badge = gallery.querySelector('.mp-gallery__badge .mp-badge__text');
      if (badge) badge.textContent = `${totalItems} фото`;
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
      factsWrap.innerHTML = data.facts.map(({ label, value }, i) => {
        const shortMap = {
          'Общая площадь': 'Общая пл.',
          'Жилая площадь': 'Жилая пл.',
          // Другие потенциальные сокращения можно добавить здесь при необходимости
        };
        const labelShort = shortMap[label] || label;
        return (
          `<li class="mp-fact" data-label="${label}">
            <span class="mp-fact__icon" aria-hidden="true">${iconByIndex[i] ? `<img src="${iconByIndex[i]}" alt="" aria-hidden="true">` : ''}</span>
            <div class="mp-fact__text">
              <div class="mp-fact__label" data-label-short="${labelShort}">${label}</div>
              <div class="mp-fact__value">${value}</div>
            </div>
          </li>`
        );
      }).join('');
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

  // Хуки печати: до открытия диалога печати прогружаем карту без lazy
  try { window.addEventListener('beforeprint', prepareMapForPrint); } catch (_) {}
  try {
    const mq = window.matchMedia && window.matchMedia('print');
    if (mq && typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', (e) => { if (e.matches) prepareMapForPrint(); });
    }
  } catch (_) {}
})();
