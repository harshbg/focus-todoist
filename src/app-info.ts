/**
 * What the app calls itself, and where it lives.
 *
 * The name follows Todoist's brand guidelines, which require a third-party
 * app to be named "x for Todoist" so it cannot be taken for an official
 * product, and require its description to say that it is not affiliated.
 * The About section reads from here; the sign-in screen uses the matching
 * translated string.
 */
export const APP_NAME = 'Deep Work with Todoist';
export const VERSION = '2.32.4';
export const AUTHOR = 'Harsh Gupta';
/* A copy served with the app, so the About section's photo shows at once. */
export const AUTHOR_AVATAR_URL = `${import.meta.env.BASE_URL}author.png`;

/** The official site, for the About section. A self-hosted copy's own address is PUBLIC_URL (vite.config.ts). */
export const SITE_URL = 'https://todo.harshgupta.com';
export const GITHUB_URL = 'https://github.com/harshbg/focus-todoist';
export const AUTHOR_GITHUB_URL = 'https://github.com/harshbg';
/*
 * The Mac app is upstream's (Enhanced for Todoist); its update card only shows
 * inside that app, so these stay pointed at upstream's releases.
 */
export const MAC_APP_URL = 'https://github.com/julesvbertolino/todoist-enhanced-desktop';
export const MAC_APP_RELEASES_URL = `${MAC_APP_URL}/releases/latest`;
export const MAC_APP_INSTALL_URL = `${MAC_APP_URL}#install-in-three-steps`;
export const MAC_APP_LATEST = '1.1.2';
export const MAC_APP_DOWNLOAD_URL = {
  arm64: `${MAC_APP_URL}/releases/latest/download/Enhanced-for-Todoist-arm64.dmg`,
  x64: `${MAC_APP_URL}/releases/latest/download/Enhanced-for-Todoist-x64.dmg`,
} as const;
/** Where a bug or an idea goes. */
export const FEEDBACK_URL = `${GITHUB_URL}/issues`;
export const TODOIST_DEVELOPER_URL =
  'https://app.todoist.com/app/settings/integrations/developer';
