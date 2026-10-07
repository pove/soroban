/**
 * Header shared by every page: brand, navigation between the game and the card generator, and
 * the language selector.
 */
import { getLanguage, setLanguage } from '../i18n/index.js';

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {'game'|'cards'} options.active page being shown
 * @param {{ game: string, cards: string }} options.links relative URLs of both pages
 * @param {string} options.titleKey translation key of the page heading
 */
export function mountSiteHeader(container, { active, links, titleKey }) {
  container.innerHTML = `
    <a class="brand" href="${links.game}" aria-label="Soroban">
      <span class="brand-mark" aria-hidden="true">🧮</span>
    </a>
    <h1 class="site-title" data-i18n="${titleKey}"></h1>
    <nav class="site-nav" data-i18n-aria-label="nav.label">
      <a class="nav-link" href="${links.game}" ${active === 'game' ? 'aria-current="page"' : ''} data-i18n="nav.game"></a>
      <a class="nav-link nav-link--cta" href="${links.cards}" ${active === 'cards' ? 'aria-current="page"' : ''}>
        <span aria-hidden="true">🖨️</span> <span data-i18n="nav.cards"></span>
      </a>
    </nav>
    <label class="language-picker">
      <span class="sr-only" data-i18n="language.label"></span>
      <select id="languageSelect">
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </label>
  `;

  const select = container.querySelector('#languageSelect');
  select.value = getLanguage();
  select.addEventListener('change', () => setLanguage(select.value));
}

/** Keeps the selector in sync when the language changes from elsewhere. */
export function syncLanguageSelect(language) {
  const select = document.getElementById('languageSelect');
  if (select) select.value = language;
}
