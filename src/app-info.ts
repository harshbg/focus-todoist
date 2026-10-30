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
export const VERSION = '2.19.0';
export const AUTHOR = 'Harsh Gupta';
/* A copy served with the app, so the About section's photo shows at once. */
export const AUTHOR_AVATAR_URL = `${import.meta.env.BASE_URL}author.png`;

/** The official site, for the About section. A self-hosted copy's own address is PUBLIC_URL (vite.config.ts). */
export const SITE_URL = 'https://todo.harshgupta.com';
export const GITHUB_URL = 'https://github.com/harshbg/focus-todoist';
export const AUTHOR_GITHUB_URL = 'https://github.com/harshbg';
/** Where a bug or an idea goes. */
export const FEEDBACK_URL = `${GITHUB_URL}/issues`;
export const TODOIST_DEVELOPER_URL =
  'https://app.todoist.com/app/settings/integrations/developer';
