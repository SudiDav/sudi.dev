import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import nextConfig from './next.config.ts';
import { bundledContent } from './build-plugins/content.ts';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    bundledContent(fileURLToPath(new URL('.', import.meta.url))),
    // Cloudflare emits a Worker bundle; standalone is only for the Node fallback.
    vinext({ nextConfig: { ...nextConfig, output: undefined } }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
