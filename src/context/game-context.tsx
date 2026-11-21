import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';

import {
  createGameSocket,
  normalizeServerUrl,
  type PlayerPayload,
  type ServerError,
  type WorldPlayer,
} from '@/services/socket';

export type ConnectionStatus = 'idle' | 'connecting' | 'online';

type GameContextValue = {
  status: ConnectionStatus;
  error: string | null;
  me: PlayerPayload | null;
  players: WorldPlayer[];
  serverUrl: string;
  join: (serverUrl: string, username: string) => void;
  leave: () => void;
  move: (dx: number, dy: number) => void;
  clearError: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<PlayerPayload | null>(null);
  const [players, setPlayers] = useState<WorldPlayer[]>([]);
  const [serverUrl, setServerUrl] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);
  const meRef = useRef<PlayerPayload | null>(null);

  const setCurrentPlayer = useCallback((player: PlayerPayload | null) => {
    meRef.current = player;
    setMe(player);
  }, []);

  const teardown = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    joinedRef.current = false;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
  }, []);

  const leave = useCallback(() => {
    teardown();
    setStatus('idle');
    setError(null);
    setCurrentPlayer(null);
    setPlayers([]);
  }, [setCurrentPlayer, teardown]);

  const join = useCallback(
    (rawUrl: string, rawUsername: string) => {
      const url = normalizeServerUrl(rawUrl);
      const username = rawUsername.trim();

      if (!url) {
        setError('Укажите адрес сервера');
        return;
      }
      if (username.length < 3) {
        setError('Ник должен содержать минимум 3 символа');
        return;
      }

      teardown();
      setError(null);
      setCurrentPlayer(null);
      setPlayers([]);
      setStatus('connecting');
      setServerUrl(url);

      const socket = createGameSocket(url);
      socketRef.current = socket;

      // Бесплатный сервер на Render засыпает без игроков и просыпается ~минуту,
      // поэтому первые попытки подключения повторяем с паузой.
      const MAX_ATTEMPTS = 7;
      let attempts = 0;

      socket.on('connect', () => {
        attempts = 0;
        setError(null);
        socket.emit('join', username);
      });

      socket.on('connect_error', () => {
        if (socketRef.current !== socket) return;

        attempts += 1;
        if (attempts < MAX_ATTEMPTS) {
          setError(`Сервер просыпается, ждём… (попытка ${attempts + 1} из ${MAX_ATTEMPTS})`);
          setTimeout(() => {
            if (socketRef.current === socket) socket.connect();
          }, 5000);
          return;
        }

        teardown();
        setStatus('idle');
        setError(`Не удалось подключиться к ${url}`);
      });

      socket.on('disconnect', (reason) => {
        if (socketRef.current !== socket) return;
        teardown();
        setStatus('idle');
        setCurrentPlayer(null);
        setPlayers([]);
        if (reason !== 'io client disconnect') {
          setError('Соединение с сервером потеряно');
        }
      });

      socket.on('players_list', (list: WorldPlayer[]) => {
        setPlayers(Array.isArray(list) ? list : []);
      });

      socket.on('player_data', (data: PlayerPayload) => {
        joinedRef.current = true;
        setCurrentPlayer(data);
        setStatus('online');
      });

      socket.on('player_joined', (player: WorldPlayer) => {
        setPlayers((prev) =>
          prev.some((item) => item.id === player.id) ? prev : [...prev, player]
        );
      });

      socket.on('player_moved', (player: WorldPlayer) => {
        setPlayers((prev) =>
          prev.map((item) =>
            item.id === player.id ? { ...item, position: player.position } : item
          )
        );
      });

      socket.on('player_left', (player: { id: string }) => {
        setPlayers((prev) => prev.filter((item) => item.id !== player.id));
      });

      socket.on('error_message', (serverError: ServerError) => {
        setError(serverError?.message ?? 'Ошибка сервера');
        if (!joinedRef.current && socketRef.current === socket) {
          teardown();
          setStatus('idle');
        }
      });
    },
    [setCurrentPlayer, teardown]
  );

  const move = useCallback(
    (dx: number, dy: number) => {
      const socket = socketRef.current;
      const current = meRef.current;
      if (!socket || !current) return;

      const position = {
        x: current.position.x + dx,
        y: current.position.y + dy,
        z: current.position.z,
      };

      setCurrentPlayer({ ...current, position });
      socket.emit('player_move', { position });
    },
    [setCurrentPlayer]
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => teardown, [teardown]);

  const value = useMemo<GameContextValue>(
    () => ({ status, error, me, players, serverUrl, join, leave, move, clearError }),
    [status, error, me, players, serverUrl, join, leave, move, clearError]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame должен использоваться внутри GameProvider');
  }
  return context;
}
