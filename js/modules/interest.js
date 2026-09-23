// "Leave a request" modal: open/close, phone mask, form submit
import { root, MP } from './state.js';
  // =================== "Leave a request" modal ===================
  export const openInterestModal = () => {
    const modal = root.querySelector('.mp-interest-modal');
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    // focus the phone field
    const phone = modal.querySelector('#mp-int-phone');
    if (phone) { try { phone.focus(); } catch (_) {} }
  };
  export const closeInterestModal = () => {
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
