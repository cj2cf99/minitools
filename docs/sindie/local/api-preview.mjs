import worker from '../../../.wrangler/sindie-acceptance/ad4ecb1/api-worker/src/entrypoint.js';

// Only the local acceptance config imports this module. The API handles its normal route and KV.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== '127.0.0.1' || url.pathname !== '/api/v1/sin-die') {
      return new Response(null, { status: 404 });
    }
    const access = {
      aud: 'sindie-local-only',
      getIdentity: async () => ({ sub: '', common_name: 'sindie-local-test', service_token_status: true }),
    };
    return worker.fetch(request, env, { access });
  },
};
