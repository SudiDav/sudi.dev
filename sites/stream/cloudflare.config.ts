import { defineConfig, defineWorker } from 'cf/config'

export default defineConfig({
  accountId: 'aa039e1fd071fc06505e7cbff58b4de3',
  worker: defineWorker({
    name: 'sudi-stream',
    domains: ['stream.sudi.dev'],
    compatibilityDate: '2026-10-30',
  }),
})
