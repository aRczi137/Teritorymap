/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_DISCORD_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
