/**
 * Registers the offline service worker (production builds only, so it never interferes with the
 * dev server).
 * @param {string} url path to `sw.js` relative to the current page
 */
export function registerServiceWorker(url) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(url).catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
