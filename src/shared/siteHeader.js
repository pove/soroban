/**
 * Header shared by every page: brand, page title and a hamburger menu (top right) holding the
 * navigation between the game and the card generator, the language selector and any
 * page-specific settings.
 */
import { getLanguage, setLanguage } from '../i18n/index.js';

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {'game'|'cards'} options.active page being shown
 * @param {{ game: string, cards: string }} options.links relative URLs of both pages
 * @param {string} options.titleKey translation key of the page heading
 * @returns {{ extras: HTMLElement }} slot at the end of the menu for page-specific controls
 */
export function mountSiteHeader(container, { active, links, titleKey }) {
  container.innerHTML = `
    <a class="brand" href="${links.game}" aria-label="Soroban">
      <img class="brand-mark" src="${links.game}images/icon-96x96.png" alt="" width="36" height="36" />
    </a>
    <h1 class="site-title" data-i18n="${titleKey}"></h1>
    <div class="menu-wrap">
      <button type="button" id="menuButton" class="menu-button" aria-expanded="false"
        aria-controls="siteMenu" data-i18n-aria-label="nav.menu" data-i18n-title="nav.menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <div id="siteMenu" class="site-menu" hidden>
        <nav class="site-nav" data-i18n-aria-label="nav.label">
          <a class="nav-link" href="${links.game}" ${active === 'game' ? 'aria-current="page"' : ''}>
            <span class="nav-icon" aria-hidden="true">🧮</span> <span data-i18n="nav.game"></span>
          </a>
          <a class="nav-link nav-link--cta" href="${links.cards}" ${active === 'cards' ? 'aria-current="page"' : ''}>
            <span class="nav-icon" aria-hidden="true">🖨️</span> <span data-i18n="nav.cards"></span>
          </a>
        </nav>
        <label class="menu-field">
          <span class="menu-label" data-i18n="language.label"></span>
          <select id="languageSelect" data-i18n-aria-label="language.label">
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <div class="menu-extras" data-menu-extras></div>
      </div>
    </div>
  `;

  const button = container.querySelector('#menuButton');
  const menu = container.querySelector('#siteMenu');
  const select = container.querySelector('#languageSelect');

  const setOpen = (open) => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', () => setOpen(menu.hidden));
  document.addEventListener('click', (event) => {
    if (!menu.hidden && !event.target.closest('.menu-wrap')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      button.focus();
    }
  });

  select.value = getLanguage();
  select.addEventListener('change', () => setLanguage(select.value));

  return { extras: container.querySelector('[data-menu-extras]') };
}

/** Keeps the selector in sync when the language changes from elsewhere. */
export function syncLanguageSelect(language) {
  const select = document.getElementById('languageSelect');
  if (select) select.value = language;
}
