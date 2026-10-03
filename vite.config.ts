import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so GitHub Pages / any static host works without a custom path.
  base: "./",
  server: {
    host: true,
    port: 3847,
    strictPort: true,
    allowedHosts: true,
  },
});
