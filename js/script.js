// Base script (no placeholder logs), isolated from the global scope
(() => {
  const root = document.querySelector('.mp-root');
  if (!root) return;
  // Keep the latest dataset for re-initializing the map when printing
  let __mp_currentData = null;

  // --- Auto-fit the title (.mp-title) font size to the width (single line) ---
  const TitleAutoFit = (() => {
    const STATE = { initialized: false, ro: null };
    const ABS_MAX_FONT = 48; // global upper bound
    const MIN_FONT = 10; // technical minimum for readability
    const STEP = 0.5; // binary search precision

    // Simple computation of a dynamic maximum for small screens
    const dynamicMaxForViewport = () => {
      const vw = Math.max(0, window.innerWidth || document.documentElement.clientWidth || 0);
      if (!vw) return ABS_MAX_FONT;
      // Threshold scale (tuned empirically):
      if (vw < 340) return 24;
      if (vw < 370) return 26;
      if (vw < 400) return 30;
      if (vw < 440) return 32;
      if (vw < 480) return 34;
      if (vw < 560) return 38;
      if (vw < 680) return 42;
      return ABS_MAX_FONT;
    };

    // Optimization: cache measurements via a hidden span
    let measureSpan = null;
    const ensureMeasureSpan = () => {
      if (measureSpan) return measureSpan;
      measureSpan = document.createElement('span');
      measureSpan.style.cssText = [
        'position:absolute','left:-9999px','top:-9999px','white-space:nowrap','padding:0','margin:0','font-weight:700','font-family:"Open Sans",Arial,sans-serif','line-height:1.1','visibility:hidden'
      ].join(';');
      document.body.appendChild(measureSpan);
      return measureSpan;
    };

    const computeBestFontSize = (titleEl) => {
      if (!titleEl || !titleEl.textContent) return;
      // Mobile mode: fixed size (18px) — no computations
      const isMobile = (window.innerWidth || 0) <= 850;
      if (isMobile) {
        titleEl.style.fontSize = '18px';
        return;
      }
      // Determine the available width: nearest ancestor with non-zero width
      let available = 0;
      let node = titleEl.parentElement;
      while (node && node !== document.body) {
        if (node.clientWidth && node.clientWidth > 0) { available = node.clientWidth; break; }
        node = node.parentElement;
      }
      if (!available) {
        // Fallback — viewport width minus a small horizontal margin
        available = Math.max(0, (window.innerWidth || 0) - 20);
      }
      available = Math.max(0, available - 2); // safe margin
      if (available <= 0) return;
      const text = titleEl.textContent.trim();
      if (!text) return;
      const span = ensureMeasureSpan();
      // Binary search over the font size
      const dynMax = dynamicMaxForViewport();
      let low = MIN_FONT;
      let high = Math.min(dynMax, parseFloat(getComputedStyle(titleEl).fontSize) || dynMax, ABS_MAX_FONT);
      let best = low;
      while (high - low > STEP) {
        const mid = (low + high) / 2;
        span.style.fontSize = mid + 'px';
        span.textContent = text;
        const w = span.offsetWidth;
        if (w <= available) { best = mid; low = mid; } else { high = mid; }
      }
      titleEl.style.fontSize = best.toFixed(2) + 'px';
    };

    // Debounce for mass layout events
    let rafId = null;
    const fitNow = () => {
      const el = root.querySelector('.mp-gallery .mp-title');
      if (!el) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // Reset to the dynamic maximum (may differ on mobile)
        const dynMax = dynamicMaxForViewport();
        el.style.fontSize = dynMax + 'px';
        computeBestFontSize(el);
      });
    };

    const init = () => {
      if (STATE.initialized) return;
      STATE.initialized = true;
      // ResizeObserver on the gallery container
      const gallery = root.querySelector('.mp-gallery');
      if (gallery && 'ResizeObserver' in window) {
        STATE.ro = new ResizeObserver(() => { fitNow(); });
        STATE.ro.observe(gallery);
      }
      // Always listen to resize + orientationchange (viewport width changes)
      window.addEventListener('resize', fitNow);
      window.addEventListener('orientationchange', () => setTimeout(fitNow, 50));
      // Re-fit when the text changes (MutationObserver on .mp-title)
      const titleEl = root.querySelector('.mp-gallery .mp-title');
      if (titleEl && 'MutationObserver' in window) {
        const mo = new MutationObserver(() => fitNow());
        mo.observe(titleEl, { characterData: true, subtree: true, childList: true });
      }
      // First run after a short timeout (in case fonts finish loading)
      setTimeout(fitNow, 0);
    };

    // Module public API
    return { init, fitNow };
  })();
  // Initialize right away (text may appear later — MutationObserver will adjust)
  TitleAutoFit.init();

  // --- Alignment: top of .mp-card (price/agent blocks) with the top of .mp-gallery__main ---
  const AlignInfoWithMain = (() => {
    let raf = null;
    const MEASURE_DELAY = 0;
    const STATE = { lockedUntil: 0 };
    const isMobile = () => (window.innerWidth || 0) <= 850; // disabled on mobile
    const measure = () => {
      if (Date.now() < STATE.lockedUntil) return; // do not measure while locked
      if (isMobile()) {
        root.style.removeProperty('--mp-main-offset');
        return;
      }
      // Reference: top of the image (not the figure container — to rule out possible inner padding/badges)
      const imageEl = root.querySelector('.mp-gallery__image');
      // Target element: the agent card
      const agentCard = root.querySelector('.mp-overview__info .mp-agent');
      const infoBlock = root.querySelector('.mp-overview__info');
      if (!imageEl || !agentCard || !infoBlock) return;
      // Reset the current offset before measuring
      root.style.setProperty('--mp-main-offset', '0px');
      const imgTop = imageEl.getBoundingClientRect().top;
      const agentTop = agentCard.getBoundingClientRect().top;
      // We need to raise the ENTIRE info block so that agentTop == imgTop.
      // So the offset = agentTop - imgTop (if the agent is below the image)
      const diff = agentTop - imgTop;
      const offset = diff > 0 ? diff : 0;
      root.style.setProperty('--mp-main-offset', offset + 'px');
    };
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTimeout(measure, MEASURE_DELAY));
    };
    const init = () => {
      schedule();
      window.addEventListener('resize', schedule);
      window.addEventListener('orientationchange', () => setTimeout(schedule, 50));
      // Recalculate when the main gallery images load (height may change due to the scrollbar appearing/disappearing, etc.)
      root.addEventListener('load', schedule, true);
      // After the title autofit and data retrieval
      root.addEventListener('mp:data', () => setTimeout(schedule, 0));
    };
    const lock = (ms = 400) => { STATE.lockedUntil = Date.now() + ms; };
    return { init, schedule, lock };
  })();
  AlignInfoWithMain.init();
  try { window.addEventListener('load', () => AlignInfoWithMain.schedule()); } catch(_) {}

  // --- Expandable price breakdown ---
  const PriceBreakdown = (() => {
    const SELECTORS = {
      card: '.mp-price-card',
      breakdown: '.mp-price-breakdown',
      button: '.mp-price-info',
    };
    let resizeObserver = null;
    let expandedForPrint = false;

    const getElements = (context) => {
      const card = (context && typeof context.closest === 'function')
        ? context.closest(SELECTORS.card)
        : root.querySelector(SELECTORS.card);
      if (!card) return {};
      const breakdown = card.querySelector(SELECTORS.breakdown);
      const button = card.querySelector(SELECTORS.button);
      return { card, breakdown, button };
    };

    const ensureMeta = (btn) => {
      if (!btn) return;
      if (!btn.dataset.tooltipOriginal) {
        btn.dataset.tooltipOriginal = btn.getAttribute('data-tooltip') || '';
      }
      if (!btn.dataset.tooltipHide) {
        btn.dataset.tooltipHide = 'Скрыть структуру стоимости';
      }
      if (!btn.dataset.ariaLabelOriginal) {
        btn.dataset.ariaLabelOriginal = btn.getAttribute('aria-label') || '';
      }
      if (!btn.dataset.ariaLabelHide) {
        btn.dataset.ariaLabelHide = 'Скрыть подробности цены';
      }
    };

    const setTooltipState = (btn, expanded) => {
      if (!btn) return;
      ensureMeta(btn);
      btn.setAttribute('data-tooltip', expanded ? (btn.dataset.tooltipHide || '') : (btn.dataset.tooltipOriginal || ''));
      btn.setAttribute('aria-label', expanded ? (btn.dataset.ariaLabelHide || '') : (btn.dataset.ariaLabelOriginal || ''));
    };

    const setAria = (btn, breakdown, expanded) => {
      if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      if (breakdown) breakdown.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    };

    const setHeight = (card, breakdown) => {
      if (!card || !breakdown) return;
      const height = breakdown.scrollHeight;
      card.style.setProperty('--mp-breakdown-height', `${Math.max(0, height)}px`);
    };

    const updateHeight = () => {
      const { card, breakdown } = getElements();
      if (!card || !breakdown) return;
      if (card.getAttribute('data-breakdown') === 'expanded') {
        setHeight(card, breakdown);
      }
    };

    const expand = (context, { markAuto = false } = {}) => {
      const { card, breakdown, button } = getElements(context);
      if (!card || !breakdown) return;
      ensureMeta(button);
      setHeight(card, breakdown);
      card.setAttribute('data-breakdown', 'expanded');
      button?.classList.add('is-active');
      setAria(button, breakdown, true);
      setTooltipState(button, true);
      expandedForPrint = markAuto;
      requestAnimationFrame(() => setHeight(card, breakdown));
      AlignInfoWithMain.schedule();
    };

    const collapse = (context, { immediate = false, markAuto = false } = {}) => {
      const { card, breakdown, button } = getElements(context);
      if (!card || !breakdown) return;
      ensureMeta(button);
      const finish = () => {
        card.removeAttribute('data-breakdown');
        card.style.setProperty('--mp-breakdown-height', '0px');
        button?.classList.remove('is-active');
        setAria(button, breakdown, false);
        setTooltipState(button, false);
        AlignInfoWithMain.schedule();
      };
      if (immediate) {
        finish();
      } else {
        // Block the alignment recalculation during the animation to avoid a jump
        AlignInfoWithMain.lock(420);
        const currentHeight = breakdown.scrollHeight;
        card.style.setProperty('--mp-breakdown-height', `${Math.max(0, currentHeight)}px`);
        requestAnimationFrame(() => {
          card.removeAttribute('data-breakdown');
          requestAnimationFrame(() => {
            card.style.setProperty('--mp-breakdown-height', '0px');
            // Recalculate the position only after the animation finishes
            setTimeout(() => AlignInfoWithMain.schedule(), 400);
          });
          button?.classList.remove('is-active');
          setAria(button, breakdown, false);
          setTooltipState(button, false);
        });
      }
      if (!markAuto) expandedForPrint = false;
    };

    const toggle = (btn) => {
      const { card } = getElements(btn);
      if (!card) return;
      const expanded = card.getAttribute('data-breakdown') === 'expanded';
      if (expanded) collapse(card); else expand(card);
    };

    const reset = () => {
      expandedForPrint = false;
      collapse(null, { immediate: true, markAuto: true });
    };

    const expandForPrint = () => {
      const { card } = getElements();
      if (!card) return;
      if (card.getAttribute('data-breakdown') === 'expanded') {
        expandedForPrint = false;
        updateHeight();
        return;
      }
      expand(card, { markAuto: true });
    };

    const restoreAfterPrint = () => {
      if (!expandedForPrint) { updateHeight(); return; }
      expandedForPrint = false;
      collapse(null, { immediate: true, markAuto: true });
    };

    const init = () => {
      reset();
      const { breakdown } = getElements();
      const inner = breakdown?.querySelector('.mp-price-breakdown__inner');
      if (inner && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => updateHeight());
        resizeObserver.observe(inner);
      }
      window.addEventListener('resize', () => updateHeight());
    };

    return {
      init,
      toggle,
      reset,
      updateHeight,
      expand: (ctx) => expand(ctx),
      collapse: (ctx, opts) => collapse(ctx, opts),
      expandForPrint,
      restoreAfterPrint,
    };
  })();
  PriceBreakdown.init();

  // --- Proportional scaling of the .mp-overview__info block (desktop) ---
  const InfoScaler = (() => {
    const SELECTOR_ROOT = '.mp-overview__info';
    const NUMERIC_PROPS = [
      'fontSize','paddingTop','paddingRight','paddingBottom','paddingLeft',
      'borderRadius','gap','rowGap','columnGap','lineHeight'
    ];
    const ROOT_PROPS = ['gap','rowGap','columnGap'];
    let scheduled = false;
    let lastScale = 1;

    const isMobile = () => (window.innerWidth || 0) <= 850;
    // Scale factor formula: smoothly from 1440px (1.0) to 1024px (~0.75), keep the minimum below
    const computeScale = () => {
      const w = (window.innerWidth || 0);
      if (w >= 1440) return 1;
      if (w <= 1024) return 0.75;
      const k = (w - 1024) / (1440 - 1024); // 0..1
      return 0.75 + k * (1 - 0.75); // linear interpolation
    };

    const parsePx = (v) => {
      if (!v) return null;
      if (v === 'normal') return null;
      const m = /([0-9]*\.?[0-9]+)/.exec(v);
      return m ? parseFloat(m[1]) : null;
    };

    const collectBaseline = (el, cs) => {
      NUMERIC_PROPS.forEach((prop) => {
        const dataKey = 'mpBase' + prop.charAt(0).toUpperCase() + prop.slice(1);
        if (el.dataset[dataKey] != null) return;
        const raw = cs.getPropertyValue(prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
        const val = parsePx(raw);
        if (val != null) el.dataset[dataKey] = String(val);
      });
    };

    const applyScaleToEl = (el, scale) => {
      NUMERIC_PROPS.forEach((prop) => {
        const dataKey = 'mpBase' + prop.charAt(0).toUpperCase() + prop.slice(1);
        const base = el.dataset[dataKey];
        if (base == null) return;
        const num = parseFloat(base);
        if (!Number.isFinite(num)) return;
        if (prop === 'lineHeight') {
          // If line-height was a number (px), scale it; if it was originally unitless, we would not have stored it
          el.style.lineHeight = (num * scale).toFixed(2) + 'px';
        } else if (prop === 'fontSize') {
          el.style.fontSize = (num * scale).toFixed(2) + 'px';
        } else if (prop.toLowerCase().includes('gap')) {
          // gap only on containers (root / grid) — apply separately
        } else if (prop.startsWith('padding')) {
          el.style[prop] = (num * scale).toFixed(2) + 'px';
        } else if (prop === 'borderRadius') {
          el.style.borderRadius = (num * scale).toFixed(2) + 'px';
        }
      });
    };

    const scaleRootProps = (rootEl, scale) => {
      const cs = getComputedStyle(rootEl);
      ROOT_PROPS.forEach((prop) => {
        const dataKey = 'mpBase' + prop.charAt(0).toUpperCase() + prop.slice(1);
        if (rootEl.dataset[dataKey] == null) {
          const raw = cs.getPropertyValue(prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
            const val = parsePx(raw);
            if (val != null) rootEl.dataset[dataKey] = String(val);
        }
        const base = rootEl.dataset[dataKey];
        if (base != null) {
          const num = parseFloat(base);
          if (Number.isFinite(num)) rootEl.style[prop] = (num * scale).toFixed(2) + 'px';
        }
      });
    };

    const resetStyles = (rootEl) => {
      // Clean up inline changes (mobile mode)
      rootEl.removeAttribute('style');
      rootEl.querySelectorAll('*').forEach((el) => {
        el.style.fontSize = '';
        el.style.lineHeight = '';
        el.style.padding = '';
        el.style.paddingTop = '';
        el.style.paddingRight = '';
        el.style.paddingBottom = '';
        el.style.paddingLeft = '';
        el.style.borderRadius = '';
      });
    };

    const apply = () => {
      const rootEl = root.querySelector(SELECTOR_ROOT);
      if (!rootEl) return;
      if (isMobile()) {
        resetStyles(rootEl);
        lastScale = 1;
        PriceBreakdown.updateHeight();
        AlignInfoWithMain.schedule();
        return;
      }
      const scale = computeScale();
      if (Math.abs(scale - lastScale) < 0.005) return; // no significant change
      lastScale = scale;
      // Collect baseline values (once)
      const all = [rootEl, ...rootEl.querySelectorAll('*')];
      all.forEach((el) => collectBaseline(el, getComputedStyle(el)));
      // Apply the scale
      scaleRootProps(rootEl, scale);
  all.forEach((el) => applyScaleToEl(el, scale));
  PriceBreakdown.updateHeight();
  // After scaling — recalculate the alignment with the main photo block
      AlignInfoWithMain.schedule();
    };

    const schedule = () => {
      if (scheduled) return; scheduled = true;
      requestAnimationFrame(() => { scheduled = false; apply(); });
    };

    const init = () => {
      schedule();
      window.addEventListener('resize', schedule);
      window.addEventListener('orientationchange', () => setTimeout(schedule, 50));
      root.addEventListener('mp:data', () => setTimeout(schedule, 0));
    };
    return { init, schedule };
  })();
  InfoScaler.init();

  // Contract: mock send to server — makes no network requests
  const MP = {
    sendToServer(action, payload) {
      // mock: log it; the integrator will replace with AJAX
      // eslint-disable-next-line no-console
      console.debug('[MP.sendToServer]', action, payload);
      return Promise.resolve({ ok: true });
    },
    emit(name, detail) {
      root.dispatchEvent(new CustomEvent(name, { detail }));
    },
  };

  // Example: click on the "Send link" button
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.mp-btn');
    if (!btn) return;
    MP.emit('mp:share:click', { ts: Date.now() });
  });

  root.addEventListener('click', (e) => {
    const infoBtn = e.target.closest('.mp-price-info');
    if (!infoBtn) return;
    e.preventDefault();
    PriceBreakdown.toggle(infoBtn);
  });

  // "Share" modal: open on click of the button in the header and in the footer
  const openShareModal = () => {
    const modal = root.querySelector('.mp-share-modal');
    if (!modal) return;
    try {
      const href = window.location?.href || '';
      const box = modal.querySelector('.mp-share__input');
      if (box) box.textContent = href;
      // Update the QR in the modal
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
      // Close any open modal
      closeShareModal();
      closeInterestModal();
      try { closePhotoModal(); } catch (_) {}
      return;
    }
  });
  // Escape closes the modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeShareModal(); closeInterestModal(); }
  });
  // "Copy" button
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

  // "Print" button — print the page
  root.addEventListener('click', (e) => {
    const printBtn = e.target.closest('.mp-header__print');
    if (!printBtn) return;
    // Before printing, prepare the map and wait for the static image to be ready when possible
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

  // QR generation via a public encoder (no JS libraries)
  const buildQrUrl = (data, sizePx = 160) => {
    const s = Math.max(32, Math.min(1024, Math.round(sizePx)));
    const encoded = encodeURIComponent(String(data || ''));
    return `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encoded}`;
  };
  // Build the static map image URL (Yandex Static Maps)
  const buildStaticMapUrl = ({ lat, lng, zoom = 16, size = [600, 400] }) => {
    const [w, h] = size;
    // API size limits: pick safe defaults
    const width = Math.max(200, Math.min(650, Math.round(w)));
    const height = Math.max(200, Math.min(650, Math.round(h)));
    // Red marker (pm2rdm)
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

  // Simple toast display function
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

  // =================== "Leave a request" modal ===================
  const openInterestModal = () => {
    const modal = root.querySelector('.mp-interest-modal');
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    // focus the phone field
    const phone = modal.querySelector('#mp-int-phone');
    if (phone) { try { phone.focus(); } catch (_) {} }
  };
  const closeInterestModal = () => {
    const modal = root.querySelector('.mp-interest-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  };
  // Open on click of the primary CTA inside #overview
  root.addEventListener('click', (e) => {
    const primaryCta = e.target.closest('#overview .mp-contact-actions .mp-cta.mp-cta--primary');
    if (!primaryCta) return;
    e.preventDefault();
    openInterestModal();
  });
  // Simplest phone validation: digits + spaces + ( ) + - allowed, at least 10 digits
  const validatePhone = (value) => {
    if (typeof value !== 'string') return false;
    const digits = value.replace(/\D+/g, '');
    return digits.length >= 10; // RU numbers are usually 10-11 digits without the country code
  };
  // Form submit handling
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

  // On successful submit — replace the buttons with the "Property interested" status
  const renderInterestedState = () => {
    const overview = root.querySelector('#overview');
    const actions = root.querySelector('#overview .mp-overview__info .mp-contact-actions');
    if (!actions) return;
    // If already rendered — do not repeat
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

  
  // Phone mask: +7 (XXX) XXX-XX-XX — lightweight, no dependencies
  const maskPhoneValue = (raw) => {
    if (typeof raw !== 'string') return '';
    let d = raw.replace(/\D+/g, '');
    if (!d) return '';
    // Normalize 8/9 to the Russian +7 format
    if (d[0] === '9') d = '7' + d; // without the country code, starting with the carrier
    else if (d[0] === '8') d = '7' + d.slice(1);
    // If not 7 — allow other countries' input without formatting
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

  // Section navigation (if links with href="#id" appear)
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

  // Copy the ID on click of the icon in the bottom-left badge
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
      // Fallback: create a temporary input
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

  // Formatting utilities (shared)
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
  // --- New logic for filling the 4x3 price grid (₽ / $* / €*) ---
  // CB rate: stored as RUB_PER[VAL] = how many rubles per 1 unit of currency.
  // The integrator can update these values when the page loads.
  const CB_RATES_RUB_PER = {
    USD: 95.00, // Example: 1 USD = 95.00 RUB
    EUR: 102.00 // Example: 1 EUR = 102.00 RUB
  };
  // Convert from rubles to currency using the table above
  const convertFromRub = (rubAmount, code) => {
    if (typeof rubAmount !== 'number' || !isFinite(rubAmount)) return null;
    const rate = CB_RATES_RUB_PER[code];
    if (!rate || rate <= 0) return null;
    return rubAmount / rate;
  };
  const fmtPlainNumber = (amount) => {
    if (typeof amount !== 'number' || !isFinite(amount)) return '';
    try { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(amount)); }
    catch (_) { return String(Math.round(amount)); }
  };
  const renderPriceBreakdown = (data) => {
    const card = root.querySelector('.mp-price-card');
    if (!card) return;
    // New grid: find elements by data-pb
    const getEl = (key) => card.querySelector(`[data-pb="${key}"]`);
    const priceRUB = (typeof data?.price === 'number') ? data.price : null;
    let pricePerSqmRUB = (typeof data?.pricePerSqm === 'number') ? data.pricePerSqm : null;
    if (pricePerSqmRUB == null && typeof data?.price === 'number' && typeof data?.totalAreaSqm === 'number' && data.totalAreaSqm > 0) {
      pricePerSqmRUB = Math.round(data.price / data.totalAreaSqm);
    }
    // Fill in rubles
    if (priceRUB != null) { const el = getEl('price-rub'); if (el) el.textContent = fmtPlainNumber(priceRUB); }
    if (pricePerSqmRUB != null) { const el = getEl('sqm-rub'); if (el) el.textContent = fmtPlainNumber(pricePerSqmRUB); }
    // Convert to USD / EUR
    ['USD','EUR'].forEach((code) => {
      if (priceRUB != null) {
        const v = convertFromRub(priceRUB, code);
        const el = getEl('price-' + code.toLowerCase());
        if (el && v != null) el.textContent = fmtPlainNumber(v);
      }
      if (pricePerSqmRUB != null) {
        const v2 = convertFromRub(pricePerSqmRUB, code);
        const el2 = getEl('sqm-' + code.toLowerCase());
        if (el2 && v2 != null) el2.textContent = fmtPlainNumber(v2);
      }
    });
    // The first cell's title (id="mp-price-breakdown-title") is left empty per the design — do not fill it.
    PriceBreakdown.reset();
    PriceBreakdown.updateHeight();
  };

  // The OLD version of renderPriceBreakdown (table-based) was removed and replaced with the new one above.

  // Simplification: we do not load the heavy Yandex JS API. We work via iframe + lightweight geocoding.

  // Map initialization: get the coordinates → insert an iframe with the point
  // Address normalization: remove the apartment/floor/entrance from the string to improve the chance of an accurate geocode
  const normalizeAddress = (addr) => {
    if (typeof addr !== 'string') return addr;
    let a = addr;
    a = a.replace(/\bкв\.?\s*\d+\b/gi, '');
    a = a.replace(/\bквартира\s*\d+\b/gi, '');
    a = a.replace(/\bподъезд\s*\d+\b/gi, '');
    a = a.replace(/\bэтаж\s*\d+\b/gi, '');
    // Frequent building format: 117/1 → 117k1 (as Yandex returns it)
    a = a.replace(/(\d+)\s*\/\s*(\d+)\b/g, '$1к$2');
    a = a.replace(/\s*,\s*,+/g, ','); // double commas
    a = a.replace(/\s{2,}/g, ' ').trim();
    a = a.replace(/,\s*$/,'');
    return a;
  };
  
  // Yandex JSONP geocoding (bypasses CORS). Returns [lat, lng]
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
  // Alternative geocoder (OSM Nominatim) — no key. Returns [lat, lng]
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
    // Try to take the coordinates from data attributes (if the integrator sets them)
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
  // Update/create the static image for printing
  const img = container.querySelector('img.mp-map__print') || (() => { const i = document.createElement('img'); i.className = 'mp-map__print'; container.appendChild(i); return i; })();
      try { img.alt = 'Карта'; } catch (_) {}
      try { img.decoding = 'sync'; img.loading = 'eager'; } catch (_) {}
  try { img.src = buildStaticMapUrl({ lat: plat, lng: plng, size: [container.clientWidth || 600, container.clientHeight || 400] }); container.classList.add('has-print-map'); } catch (_) {}
    };

    // 1) if coordinates are given — draw immediately
  if (lat != null && lng != null) { buildIframeWithPoint(lat, lng); return; }

    // 2) address present — Yandex JSONP → OSM → as a last resort search (may show "1 found")
    jsonpGeocode(address)
      .then(([plat, plng]) => buildIframeWithPoint(plat, plng))
      .catch(() => osmGeocode(address)
        .then(([plat, plng]) => buildIframeWithPoint(plat, plng))
        .catch(() => {
          const q = encodeURIComponent(address || '');
          const src = `https://yandex.ru/map-widget/v1/?text=${q}&z=16`;
          container.innerHTML = `<iframe title="Карта" src="${src}" style="border:0;width:100%;height:100%" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
          // No exact coordinates — build the static map without a marker (the API does not support centering on text), leave only the iframe for printing
          const img = container.querySelector('img.mp-map__print') || (() => { const i = document.createElement('img'); i.className = 'mp-map__print'; container.appendChild(i); return i; })();
          try { img.removeAttribute('src'); } catch (_) {}
        })
      );
  };

  // Before printing, make sure the map is rendered and not "lazy"
  const prepareMapForPrint = () => {
    const container = root.querySelector('#mp-map');
    if (!container) return;
  // If the iframe is not inserted yet — insert a quick search variant by address
    let iframe = container.querySelector('iframe');
    if (!iframe) {
      // Attempt to take the address from data/DOM
      const addrFromData = (__mp_currentData && __mp_currentData.address) || '';
      const addrFromDom = (root.querySelector('.mp-gallery .mp-address__text')?.textContent || '').trim();
      const address = addrFromData || addrFromDom || '';
      if (address) {
        const q = encodeURIComponent(address);
        const src = `https://yandex.ru/map-widget/v1/?text=${q}&z=16`;
        container.innerHTML = `<iframe title="Карта" src="${src}" style="border:0;width:100%;height:100%" loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
        // Try to create a static image if the section has known coordinates
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
        // If the address is unavailable, try the standard initialization
        try { initMap(__mp_currentData); } catch (_) {}
      }
    }
    // Force off lazy loading and restart loading
    if (iframe) {
      try { iframe.setAttribute('loading', 'eager'); } catch (_) {}
      try { iframe.src = iframe.src; } catch (_) {}
    }
    // Make sure the static map image is ready — wait briefly
    const img = container.querySelector('img.mp-map__print');
    if (img && !img.complete) {
      try {
        const t0 = Date.now();
        const done = (cb) => {
          if (img.complete || img.naturalWidth > 0 || Date.now() - t0 > 1500) cb();
          else setTimeout(() => done(cb), 60);
        };
        // Printing is triggered by external code; here we just try to get it loaded in time
        done(() => {});
      } catch (_) {}
    }
  };

  // Delegated click on gallery previews — a single handler on the root
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
      // update the background blur for the square area
      const mainWrap = gallery.querySelector('.mp-gallery__main');
      if (mainWrap) {
        try {
          mainWrap.style.setProperty('--mp-gallery-bg', `url("${full}")`);
          mainWrap.style.backgroundImage = `url('${full}')`;
          mainWrap.style.backgroundSize = 'cover';
          mainWrap.style.backgroundPosition = 'center';
          // Fallback background <img> with blur
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
      // show the play button only on the video frame
      const playBtn = gallery.querySelector('.mp-gallery__play');
      if (playBtn) playBtn.hidden = !isVideo;
      gallery.querySelectorAll('.mp-gallery__thumb.is-active').forEach((el) => el.classList.remove('is-active'));
      btn.classList.add('is-active');
      MP.emit('mp:gallery:change', { src: full, type: isVideo ? 'video' : 'photo' });
      updateGalleryNavVisibility();
    }
  });

  // =================== Photo lightbox ===================
  const openPhotoModal = () => {
    const modal = root.querySelector('.mp-photo-modal');
    const gallery = root.querySelector('.mp-gallery');
    if (!modal || !gallery) return;
    // Title
    const title = (gallery.querySelector('.mp-title')?.textContent || '').trim();
    const titleEl = modal.querySelector('.mp-photo__title');
    if (titleEl) titleEl.textContent = title;
    // "Call" button — use the number from the agent card if available
    const phoneLink = root.querySelector('.mp-agent .mp-agent__phone');
    const callBtn = modal.querySelector('.mp-photo__call');
    if (callBtn) {
      const href = phoneLink?.getAttribute('href') || '#';
      callBtn.setAttribute('href', href);
    }
    // List of previews (in the gallery) and the active index — excluding video
    const allThumbs = Array.from(gallery.querySelectorAll('.mp-gallery__thumbs .mp-gallery__thumb'));
    const photoThumbs = allThumbs.filter((t) => t.getAttribute('data-type') !== 'video');
    const activePhotoIndex = Math.max(0, photoThumbs.findIndex((t) => t.classList.contains('is-active')));
    // If the video item is active, put the first photo into the modal
    const activeIsVideo = !!allThumbs.find((t) => t.classList.contains('is-active') && t.getAttribute('data-type') === 'video');
    const mainSrc = activeIsVideo
      ? (photoThumbs[0]?.getAttribute('data-full') || photoThumbs[0]?.querySelector('img')?.getAttribute('src') || '')
      : (gallery.querySelector('.mp-gallery__image')?.getAttribute('src') || '');
    const img = modal.querySelector('.mp-photo__image');
    if (img && mainSrc) img.src = mainSrc;
    // Previews in the modal
    const thumbsWrap = modal.querySelector('.mp-photo__thumbs');
    if (thumbsWrap) {
      if (photoThumbs.length) {
        thumbsWrap.innerHTML = photoThumbs.map((t, i) => {
          const src = t.querySelector('img')?.getAttribute('src') || t.getAttribute('data-full') || '';
          return `<button class="mp-gallery__thumb${i === activePhotoIndex ? ' is-active' : ''}" type="button" data-full="${src}"><img src="${src}" alt="Превью ${i + 1}"></button>`;
        }).join('');
      } else {
        // Fallback — if there are no thumbnails but there is a main src
        thumbsWrap.innerHTML = mainSrc ? `<button class="mp-gallery__thumb is-active" type="button" data-full="${mainSrc}"><img src="${mainSrc}" alt="Превью"></button>` : '';
      }
    }
    updatePhotoNavVisibility();
    // Scroll the thumbnails so the active one is visible
    try {
      const activeThumb = modal.querySelector('.mp-photo__thumbs .mp-gallery__thumb.is-active');
      activeThumb?.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
    } catch (_) {}
    // Show the modal
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

  // Open: click on the current photo (not on arrows/badges)
  root.addEventListener('click', (e) => {
    if (e.target.closest('.mp-gallery__play')) return; // do not open the photo if the click is on play
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

  // =================== Video: open/close modal ===================
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
    // Stop and clear the source
    if (video) {
      try { video.pause(); } catch (_) {}
      try { video.removeAttribute('src'); video.load?.(); } catch (_) {}
    }
  };
  // Play button on the main photo
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.mp-gallery__play');
    if (!btn) return;
    e.preventDefault();
    // Video source: data-video on the button or on .mp-gallery, then a fallback (empty)
    const gallery = root.querySelector('.mp-gallery');
    const src = btn.getAttribute('data-video')
      || gallery?.getAttribute('data-video')
      || '';
    openVideoModal(src);
  });
  // Video close on overlay/close icon is already handled by the common handler; adding an explicit call
  root.addEventListener('click', (e) => {
    const isClose = e.target.closest('.mp-video-modal [data-close="true"]');
    if (!isClose) return;
    closeVideoModal();
  });
  // ESC closes the video
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeVideoModal(); });
  // Navigation inside the lightbox
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
  // Click on a thumbnail inside the lightbox
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
  // Additional close on Esc
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
  // Overlay click is handled by the common data-close="true" handler above

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

  // "Next photo" button on the current image
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
    // click the next preview — reuse the existing logic
    thumbs[nextIndex].click();
  });

  // "Previous photo" button
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

  // Show/hide arrows on the first/last photo
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
  // Update visibility when the gallery changes
  root.addEventListener('mp:gallery:change', updateGalleryNavVisibility);
  // Sync the active state of indicators when the photo changes
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

  // Click on an indicator → switch photo
  root.addEventListener('click', (e) => {
    const ind = e.target.closest('.mp-gallery__indicator');
    if (!ind) return;
    const idx = Number(ind.getAttribute('data-index')) || 0;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const thumbs = Array.from(gallery.querySelectorAll('.mp-gallery__thumbs .mp-gallery__thumb'));
    if (thumbs[idx]) thumbs[idx].click();
  });
  // And on the initial data render
  root.addEventListener('mp:data', () => setTimeout(updateGalleryNavVisibility, 0));

  // Render the whole card from the given data
  const renderAll = (data) => {
    __mp_currentData = data || __mp_currentData;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery || !data) return;

    // Title and address
    const titleEl = gallery.querySelector('.mp-title');
    const addrEl = gallery.querySelector('.mp-address__text');
    if (titleEl) titleEl.textContent = data.name || '';
    if (addrEl) addrEl.textContent = data.address || '';

    // Main photo/video and previews
    const mainImg = gallery.querySelector('.mp-gallery__image');
    const playBtn = gallery.querySelector('.mp-gallery__play');
    const videoSrc = (typeof data.video === 'string' && data.video.trim()) ? data.video.trim() : (gallery.getAttribute('data-video') || '').trim();
    const hasPhotos = Array.isArray(data.photos) && data.photos.length;
    const hasVideo = !!videoSrc;
    
    // Function to extract a poster from the video
    const extractVideoPoster = (videoUrl, callback) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true; // required for autoplay
      video.currentTime = 1.5; // take the frame at 1.5 seconds
      
      video.addEventListener('loadeddata', () => {
        try {
          // Try to extract via Canvas
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const posterUrl = canvas.toDataURL('image/jpeg', 0.8);
          callback(posterUrl);
        } catch (err) {
          console.warn('Canvas extraction failed, trying video poster approach:', err);
          // Fallback: use the video element itself as the source
          callback(videoUrl + '#t=1'); // URL with a timecode for the poster
        }
      });
      
      video.addEventListener('error', (e) => {
        console.warn('Ошибка загрузки видео для постера:', e);
        callback(hasPhotos ? data.photos[0] : ''); // final fallback
      });
      
      // Timeout in case loading takes long
      setTimeout(() => {
        if (video.readyState < 2) { // if the video did not load within 3 seconds
          callback(hasPhotos ? data.photos[0] : '');
        }
      }, 3000);
      
      video.src = videoUrl;
    };

    if (hasPhotos || hasVideo) {
      // Set the main frame
      if (mainImg) {
        if (hasVideo) {
          // Temporarily set the fallback while extracting the poster from the video
          const fallbackPoster = hasPhotos ? data.photos[0] : '';
          mainImg.src = fallbackPoster;
          
          // Extract the real poster from the video
          extractVideoPoster(videoSrc, (posterUrl) => {
            if (posterUrl && mainImg) {
              mainImg.src = posterUrl;
              // Update the background too
              const mainWrap = gallery.querySelector('.mp-gallery__main');
              if (mainWrap) {
                try {
                  mainWrap.style.setProperty('--mp-gallery-bg', `url("${posterUrl}")`);
                  mainWrap.style.backgroundImage = `url('${posterUrl}')`;
                  const bg = mainWrap.querySelector('img.mp-gallery__bg');
                  if (bg) bg.src = posterUrl;
                } catch (_) {}
              }
              // Update the video preview in the carousel
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
        
        // Background setup (will be updated asynchronously for video)
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
      // Visibility and source of the play button: shown on load only if the video comes first
      if (playBtn) {
        playBtn.hidden = !hasVideo; // on load: if there is a video, show it (since the video comes first)
        if (hasVideo) playBtn.setAttribute('data-video', videoSrc); else playBtn.removeAttribute('data-video');
      }
      // Build previews: video first (if any), then photos
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
      // Carousel indicators (mobile): create/update
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
      // Update the count badge (including video)
      const badge = gallery.querySelector('.mp-gallery__badge .mp-badge__text');
      if (badge) badge.textContent = `${totalItems} фото`;
    }

    // ID badge (bottom left): taken from the id URL parameter
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

    // Facts
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
          // Other potential abbreviations can be added here if needed
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

    // Price and price per m²
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

    // Extended price breakdown
    renderPriceBreakdown(data);

    // Deal terms (2x2 grid)
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

    // About the property (4x3)
    const aboutWrap = root.querySelector('.mp-about__grid');
    if (aboutWrap && Array.isArray(data.about)) {
      aboutWrap.innerHTML = data.about.map(({ label, value }) => (
        `<li class="mp-about__item">
          <span class="mp-about__label">${label}</span>
          <span class="mp-about__value">${value}</span>
        </li>`
      )).join('');
    }

    // About the building (2x3)
    const buildingWrap = root.querySelector('.mp-building__grid');
    if (buildingWrap && Array.isArray(data.building)) {
      buildingWrap.innerHTML = data.building.map(({ label, value }) => (
        `<li class="mp-building__item">
          <span class="mp-building__label">${label}</span>
          <span class="mp-building__value">${value}</span>
        </li>`
      )).join('');
    }

    // Description (plain text)
    const descEl = root.querySelector('.mp-description__text');
    if (descEl && typeof data.description === 'string') {
      descEl.textContent = data.description;
    }

    // Location: initialize the map
    try { initMap(data); } catch (err) { /* no-op */ }
  };

  // Initialization: if the data is already globally available — render; otherwise wait for the mp:data event
  const initialData = (typeof window !== 'undefined' && window.MP_MOCK) ? window.MP_MOCK : null;
  if (initialData) {
    renderAll(initialData);
    // after the initial render, adjust arrow visibility right away
    setTimeout(() => {
      try { updateGalleryNavVisibility(); } catch (_) {}
      try { TitleAutoFit.fitNow(); } catch (_) {}
    }, 0);
    // QR image initialization
    try { updateQrImages('all'); } catch (_) {}
  }
  root.addEventListener('mp:data', (e) => {
    if (e && e.detail) {
      renderAll(e.detail);
      // after the data changes, recalculate the title size
      setTimeout(() => { try { TitleAutoFit.fitNow(); } catch (_) {} }, 0);
    }
  });

  // Print hooks: before the print dialog opens, load the map without lazy
  const fitTitleForPrint = () => {
    const title = root.querySelector('.mp-gallery .mp-title');
    if (!title) return;
    // Save the original inline font-size (if any)
    if (!title.dataset.printOriginalFontSize) {
      title.dataset.printOriginalFontSize = title.style.fontSize || '';
    }
    const originalComputed = parseFloat(getComputedStyle(title).fontSize) || 48;
    // Compute the available width — parent width or root
    const parent = title.parentElement || root;
    const available = (parent.clientWidth || 0) - 4; // small margin
    if (available <= 0) return;
    // Binary search reducing the size
    let low = 8;
    let high = originalComputed;
    const span = document.createElement('span');
    span.style.cssText = 'position:absolute;left:-9999px;top:-9999px;white-space:nowrap;font-weight:' + getComputedStyle(title).fontWeight + ';font-family:' + getComputedStyle(title).fontFamily + ';';
    document.body.appendChild(span);
    const text = title.textContent?.trim() || '';
    span.textContent = text;
    while (high - low > 0.5) {
      const mid = (low + high) / 2;
      span.style.fontSize = mid + 'px';
      if (span.offsetWidth <= available) {
        low = mid; // can go bigger
      } else {
        high = mid; // too wide
      }
    }
    const finalSize = Math.min(originalComputed, low);
    title.style.fontSize = finalSize.toFixed(2) + 'px';
    document.body.removeChild(span);
  };
  const restoreTitleAfterPrint = () => {
    const title = root.querySelector('.mp-gallery .mp-title');
    if (!title) return;
    const orig = title.dataset.printOriginalFontSize;
    if (orig !== undefined) {
      title.style.fontSize = orig;
      delete title.dataset.printOriginalFontSize;
    }
    // Restart the regular autofit for screen mode
    try { TitleAutoFit.fitNow(); } catch (_) {}
    PriceBreakdown.restoreAfterPrint();
  };
  try { window.addEventListener('beforeprint', () => { prepareMapForPrint(); fitTitleForPrint(); PriceBreakdown.expandForPrint(); }); } catch (_) {}
  try {
    const mq = window.matchMedia && window.matchMedia('print');
    if (mq && typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', (e) => {
        if (e.matches) { prepareMapForPrint(); fitTitleForPrint(); PriceBreakdown.expandForPrint(); }
        else { restoreTitleAfterPrint(); }
      });
    }
  } catch (_) {}
  try { window.addEventListener('afterprint', restoreTitleAfterPrint); } catch(_) {}
})();
