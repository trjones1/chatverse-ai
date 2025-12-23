// instrumentation.ts - Next.js instrumentation file
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export async function onRequestError(
  err: Error,
  request: any,
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
  },
) {
  const { captureRequestError } = await import('@sentry/nextjs');
  
  // Create a basic request info object that Sentry expects
  const requestInfo = {
    path: context.routePath,
    url: request.url || context.routePath,
    method: request.method || 'GET',
    headers: request.headers || {},
  };
  
  captureRequestError(err, requestInfo as any, context);
}