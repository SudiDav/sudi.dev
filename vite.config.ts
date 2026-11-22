import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import nextConfig from './next.config.ts';
import { bundledContent } from './build-plugins/content.ts';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    bundledContent(fileURLToPath(new URL('.', import.meta.url))),
    vinext({
      nextConfig: {
        ...nextConfig,
        // Cloudflare emits a Worker bundle. Standalone is only for the Node fallback.
        output: undefined,
        // Cached documents are shared across user agents. Always render metadata in the head.
        htmlLimitedBots: /.*/,
      },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
