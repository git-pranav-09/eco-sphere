import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Vercel serves static files from /public; keep the Express server at the repo root.
  publicDir: false,
  build: {
    outDir: "public",
    emptyOutDir: true
  }
});
