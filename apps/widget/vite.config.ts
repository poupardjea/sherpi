import { defineConfig } from "vite";

// Un seul fichier w.js (IIFE), à inclure par <script src=".../w.js" data-shop="…" async>.
export default defineConfig({
  build: {
    lib: { entry: "src/index.ts", formats: ["iife"], name: "ConseillerCadeau", fileName: () => "w.js" },
    target: "es2020",
    emptyOutDir: true,
  },
});
