import { defineConfig } from "npm:vite@5";

export default defineConfig({
  base: "/cmpm-121-final-project/",
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  assetsInclude: ["**/*.wasm"],
});
