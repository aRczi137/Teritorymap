import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: '/teritorymap/',
  plugins: [react()],
  server: {
    host: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
