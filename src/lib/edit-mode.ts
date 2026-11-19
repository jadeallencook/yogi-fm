/**
 * True only on the local dev server started with `npm run dev:edit`
 * (PUBLIC_EDIT_MODE=true). Requiring DEV too means a production build never
 * contains the edit UI, even if the variable happens to be set.
 */
export const EDIT_MODE = import.meta.env.DEV && import.meta.env.PUBLIC_EDIT_MODE === 'true';
