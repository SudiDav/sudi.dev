import vinext from 'vinext/server/app-router-entry'

export default {
  ...vinext,

  fetch(request, env, ctx) {
    if (request.headers.get('user-agent')) return vinext.fetch(request, env, ctx)

    // Vinext streams metadata for a missing user agent even with htmlLimitedBots set.
    const headers = new Headers(request.headers)
    headers.set('user-agent', 'sudi.dev')
    return vinext.fetch(new Request(request, { headers }), env, ctx)
  },
} satisfies typeof vinext
