import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig(({ mode, isPreview }) => ({
  accountId: 'aa039e1fd071fc06505e7cbff58b4de3',
  worker: defineWorker({
    name: mode === 'preview' || isPreview ? 'sudi-dev-preview' : 'sudi-dev',
    domains: mode === 'preview' ? ['preview.sudi.dev'] : ['sudi.dev'],
    ...(mode === 'preview' || isPreview ? {} : {
      workersDev: false,
      previewUrls: false,
      observability: {
        enabled: false,
        logs: { enabled: true },
        traces: { enabled: true },
        issues: { enabled: true },
      },
    }),
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-30",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      HOSTING_PROVIDER: bindings.text('cloudflare'),
      AUTH_TRUST_HOST: bindings.text('true'),
      AUTH_SECRET: bindings.secret(),
      // Public previews have no production identity, publishing, mail, or AI credentials.
      ...(mode === 'preview' || isPreview ? {} : {
      ADMIN_EMAIL: bindings.secret(),
      AUTH_GITHUB_ID: bindings.secret(),
      AUTH_GITHUB_SECRET: bindings.secret(),
      GITHUB_TOKEN: bindings.secret(),
      GITHUB_REPO: bindings.text('SudiDav/sudi.dev'),
      GITHUB_BRANCH: bindings.text('main'),
      RESEND_API_KEY: bindings.secret(),
      RESEND_AUDIENCE_ID: bindings.secret(),
      CONTACT_EMAIL: bindings.secret(),
      EMAIL_FROM: bindings.secret(),
      // Add weekly-draft secrets only when enabling that currently inactive feature.
      }),
    },
  }),
}));
