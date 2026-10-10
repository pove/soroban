/** Text of the page footer: author, version and the commit the site was built from. */
export function versionText(t) {
  const text = t('footer.version', { version: __APP_VERSION__ });
  return __APP_COMMIT__ ? `${text} · ${__APP_COMMIT__}` : text;
}
