import { io, type Socket } from 'socket.io-client';

export type Vec3 = { x: number; y: number; z: number };

export type WorldPlayer = {
  id: string;
  username: string;
  position: Vec3;
};

export type PlayerPayload = WorldPlayer & {
  money: number;
  inventory: unknown[];
};

export type ServerError = {
  code: string;
  message: string;
};

/** Приводит введённый адрес к виду http(s)://host:port без хвостового слэша. */
export function normalizeServerUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
}

/** Создаёт соединение с игровым сервером. События подписываются в контексте игры. */
export function createGameSocket(url: string): Socket {
  return io(url, {
    transports: ['websocket'],
    timeout: 8000,
    // Переподключением управляет контекст игры: бесплатный сервер на Render
    // просыпается около минуты, поэтому нужны повторные попытки с паузой.
    reconnection: false,
  });
}
