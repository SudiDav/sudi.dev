import { bindings, defineConfig, defineWorker, triggers } from 'cf/config'

export default defineConfig(({ mode, isPreview }) => ({
  accountId: 'aa039e1fd071fc06505e7cbff58b4de3',
  worker: defineWorker({
    name: mode === 'preview' || isPreview ? 'sudi-stream-preview' : 'sudi-stream',
    domains: mode === 'preview' || isPreview ? [] : ['stream.sudi.dev'],
    workersDev: false,
    previewUrls: false,
    entrypoint: './worker.ts',
    compatibilityDate: '2026-10-30',
    assets: { runWorkerFirst: ['/api/*'] },
    triggers: mode === 'preview' || isPreview || mode === 'setup' ? [] : [triggers.scheduled({ schedule: '17 */6 * * *' })],
    env: {
      ASSETS: bindings.assets(),
      MOVIES_STORAGE: bindings.kv(),
      ...(mode === 'preview' || isPreview || mode === 'setup' ? {} : {
        TMDB_READ_TOKEN: bindings.secret(),
        OMDB_API_KEY: bindings.secret(),
        MOVIE_REFRESH_TOKEN: bindings.secret(),
      }),
    },
  }),
}))
