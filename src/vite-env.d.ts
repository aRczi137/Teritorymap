/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_DISCORD_ID?: string;
  readonly VITE_ADMIN_DISCORD_ID_2?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
