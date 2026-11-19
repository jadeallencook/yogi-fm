interface ImportMetaEnv {
  /** "true" when started with `npm run dev:edit`; see src/lib/edit-mode.ts. */
  readonly PUBLIC_EDIT_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
