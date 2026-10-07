/** Non-blocking status messages that replace `alert()`. */

let region = null;

function getRegion() {
  if (region?.isConnected) return region;
  region = document.createElement('div');
  region.className = 'toast-region';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  document.body.appendChild(region);
  return region;
}

/**
 * @param {string} message
 * @param {{ kind?: 'info'|'error', duration?: number }} [options]
 */
export function showToast(message, { kind = 'info', duration = 4000 } = {}) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${kind}`;
  toast.textContent = message;
  getRegion().appendChild(toast);
  setTimeout(() => toast.remove(), duration);
  return toast;
}
