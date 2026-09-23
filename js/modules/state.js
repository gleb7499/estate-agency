// Shared state: root element, current dataset, mock server contract, toast
export const root = document.querySelector('.mp-root');

let currentData = null;
export const getData = () => currentData;
export const setData = (d) => { if (d) currentData = d; };

  // Contract: mock send to server — makes no network requests
  export const MP = {
    sendToServer(action, payload) {
      // mock: log it; the integrator will replace with AJAX
       
      console.debug('[MP.sendToServer]', action, payload);
      return Promise.resolve({ ok: true });
    },
    emit(name, detail) {
      root.dispatchEvent(new CustomEvent(name, { detail }));
    },
  };

  // Simple toast display function
  export const showToast = (message, ms = 1400) => {
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

