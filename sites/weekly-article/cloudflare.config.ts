import { bindings, defineConfig, defineWorker } from 'cf/config'

export default defineConfig({
  accountId: 'aa039e1fd071fc06505e7cbff58b4de3',
  worker: defineWorker({
    name: 'sudi-weekly-article',
    entrypoint: './worker.ts',
    compatibilityDate: '2026-10-30',
    // Enable Monday 06:00 UTC only after transferring the Vercel cron.
    triggers: [],
    env: {
      SITE: bindings.worker({ worker: 'sudi-dev' }),
      CRON_SECRET: bindings.secret(),
    },
  }),
})
