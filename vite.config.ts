import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    // PWA: manifest + service worker + offline fallback
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true }, // enable SW in dev for easy testing
      includeAssets: [
        "icons/icon-192x192.png",
        "icons/icon-512x512.png",
        "offline.html",
      ],
      manifest: {
        name: "SW Monthly Golf",
        short_name: "SW Golf",
        description: "Mobile-first golf tournament management PWA",
        theme_color: "#16a34a",
        background_color: "#f9fafb",
        display: "standalone",
        start_url: "/",
        orientation: "portrait",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        navigateFallback: "/offline.html",
      },
    }),

  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  // Client app root
  root: path.resolve(import.meta.dirname, "client"),
  // Build outputs into the server's static directory
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
