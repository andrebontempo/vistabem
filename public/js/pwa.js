/**
 * Registro de PWA
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // SW registrado com sucesso
      })
      .catch((err) => {
        console.warn('SW falhou:', err);
      });
  });
}
