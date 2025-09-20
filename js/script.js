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
})();
