const DEFAULT_DEV_ENDPOINT = 'ws://localhost:8080/ws';

const resolveFromLocation = (): string => {
  if (typeof window === 'undefined') {
    return DEFAULT_DEV_ENDPOINT;
  }

  const { protocol, hostname, port } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const isDefaultDevPort = !port || ['3000', '3001', '3002'].includes(port);
  const portSegment = isDefaultDevPort
    ? wsProtocol === 'wss:'
      ? ''
      : ':8080'
    : `:${port}`;

  return `${wsProtocol}//${hostname}${portSegment}/ws`;
};

export const getEngineWsUrl = (fallback?: string): string => {
  const envUrl = process.env.NEXT_PUBLIC_ENGINE_WS;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl;
  }

  if (fallback && fallback.trim().length > 0 && typeof window === 'undefined') {
    return fallback;
  }

  return resolveFromLocation();
};

export const getDevEngineWsUrl = (): string => DEFAULT_DEV_ENDPOINT;
