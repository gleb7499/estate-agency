// Share modal: open/close, copy link, QR images
import { root, MP } from './state.js';
  // Example: click on the "Send link" button
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.mp-btn');
    if (!btn) return;
    MP.emit('mp:share:click', { ts: Date.now() });
  });

  // "Share" modal: open on click of the button in the header and in the footer
  export const openShareModal = () => {
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
  export const closeShareModal = () => {
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

  // QR generation via a public encoder (no JS libraries)
  const buildQrUrl = (data, sizePx = 160) => {
    const s = Math.max(32, Math.min(1024, Math.round(sizePx)));
    const encoded = encodeURIComponent(String(data || ''));
    return `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encoded}`;
  };
  export const updateQrImages = (scope = 'all') => {
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

