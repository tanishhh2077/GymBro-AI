import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { serviceWorkerPlugin } from "./vite.serviceWorker";

export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ["@mediapipe/tasks-vision"],
  },
});
