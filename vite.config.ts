import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "GameHub — Holiday Games",
        short_name: "GameHub",
        description:
          "Family game nights, anywhere. Offline games, tools and scores.",
        theme_color: "#6155d9",
        background_color: "#faf9f6",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  server: { host: "127.0.0.1", port: 5173 },
  preview: { host: "127.0.0.1", port: 4173 },
});
