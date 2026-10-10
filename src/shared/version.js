/**
 * Text of the page footer: author and version. In a build from git the patch number gives way to
 * the commit the site was built from (3.5.0 → 3.5.1ee99ec), which says exactly which build is live.
 */
export function versionText(t) {
  const [major, minor] = __APP_VERSION__.split('.');
  const version = __APP_COMMIT__ ? `${major}.${minor}.${__APP_COMMIT__}` : __APP_VERSION__;
  return t('footer.version', { version });
}
