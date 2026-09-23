// Bootstrap: initial render, mp:data event, modal close wiring, print hooks
import { root } from './modules/state.js';
import { TitleAutoFit, AlignInfoWithMain, InfoScaler } from './modules/layout.js';
import { PriceBreakdown } from './modules/price.js';
import { renderAll, closePhotoModal, updateGalleryNavVisibility, fitTitleForPrint, restoreTitleAfterPrint } from './modules/gallery.js';
import { closeShareModal, updateQrImages } from './modules/share.js';
import { closeInterestModal } from './modules/interest.js';
import { prepareMapForPrint } from './modules/map.js';

if (root) {
  // Layout modules initialize right away (text may appear later — MutationObserver will adjust)
  TitleAutoFit.init();
  AlignInfoWithMain.init();
  InfoScaler.init();
  PriceBreakdown.init();

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

  // Close button ([data-close="true"]) inside any modal closes all modals
  root.addEventListener('click', (e) => {
    const isClose = e.target.closest('[data-close="true"]');
    if (!isClose) return;
    closeShareModal();
    closeInterestModal();
    try { closePhotoModal(); } catch (_) {}
  });

  // Escape closes the modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeShareModal(); closeInterestModal(); }
  });

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
  try { window.addEventListener('afterprint', restoreTitleAfterPrint); } catch (_) {}
}
