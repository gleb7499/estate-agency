// Layout modules: title auto-fit, info block alignment and proportional scaling
import { root } from './state.js';
import { PriceBreakdown } from './price.js';
  // --- Auto-fit the title (.mp-title) font size to the width (single line) ---
  export const TitleAutoFit = (() => {
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
  

  // --- Alignment: top of .mp-card (price/agent blocks) with the top of .mp-gallery__main ---
  export const AlignInfoWithMain = (() => {
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
  
  try { window.addEventListener('load', () => AlignInfoWithMain.schedule()); } catch(_) {}


  // --- Proportional scaling of the .mp-overview__info block (desktop) ---
  export const InfoScaler = (() => {
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
  

