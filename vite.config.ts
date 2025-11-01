import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "de93ff38ed5a.ngrok-free.app",
      "5f695b504ed7.ngrok-free.app",
      "b8c0af9231d1.ngrok-free.app",
      ".ngrok-free.app", // Allow all ngrok hosts
      ".ngrok.io", // Allow all ngrok.io hosts
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
