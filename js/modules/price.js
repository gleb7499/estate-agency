// Expandable price breakdown and the 4x3 price grid (RUB / USD / EUR)
import { root } from './state.js';
import { AlignInfoWithMain } from './layout.js';
import { CB_RATES_RUB_PER, convertFromRub, fmtPlainNumber } from './format.js';
  // --- Expandable price breakdown ---
  export const PriceBreakdown = (() => {
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
  


// Click on the price-info icon toggles the breakdown
  root.addEventListener('click', (e) => {
    const infoBtn = e.target.closest('.mp-price-info');
    if (!infoBtn) return;
    e.preventDefault();
    PriceBreakdown.toggle(infoBtn);
  });

  export const renderPriceBreakdown = (data) => {
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
