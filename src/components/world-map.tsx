import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PlayerPayload, WorldPlayer } from '@/services/socket';

const WORLD_LIMIT = 100;

function toPercent(value: number) {
  const clamped = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, value));
  return `${((clamped + WORLD_LIMIT) / (WORLD_LIMIT * 2)) * 100}%` as const;
}

function PlayerDot({
  player,
  isMe,
  accent,
  muted,
}: {
  player: WorldPlayer;
  isMe?: boolean;
  accent: string;
  muted: string;
}) {
  return (
    <View
      pointerEvents="none"
      style={[styles.marker, { left: toPercent(player.position.x), top: toPercent(player.position.y) }]}>
      <View style={[styles.dot, { backgroundColor: isMe ? accent : muted }]} />
      <ThemedText type="small" numberOfLines={1} style={styles.label}>
        {isMe ? 'Вы' : player.username}
      </ThemedText>
    </View>
  );
}

export function WorldMap({ me, players }: { me: PlayerPayload; players: WorldPlayer[] }) {
  const theme = useTheme();

  return (
    <View style={[styles.map, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.axis, styles.axisHorizontal, { backgroundColor: theme.backgroundSelected }]} />
      <View style={[styles.axis, styles.axisVertical, { backgroundColor: theme.backgroundSelected }]} />

      {players.map((player) => (
        <PlayerDot
          key={player.id}
          player={player}
          accent="#208AEF"
          muted={theme.textSecondary}
        />
      ))}
      <PlayerDot player={me} isMe accent="#208AEF" muted={theme.textSecondary} />

      <ThemedText type="code" themeColor="textSecondary" style={styles.coords}>
        x {Math.round(me.position.x)} · y {Math.round(me.position.y)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    aspectRatio: 1,
    width: '100%',
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  axis: {
    position: 'absolute',
  },
  axisHorizontal: {
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
  },
  axisVertical: {
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    width: 88,
    marginLeft: -44,
    marginTop: -7,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  label: {
    fontSize: 10,
    lineHeight: 14,
  },
  coords: {
    position: 'absolute',
    left: Spacing.three,
    bottom: Spacing.two,
  },
});
