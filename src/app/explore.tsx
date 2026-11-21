import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useGame } from '@/context/game-context';
import { useTheme } from '@/hooks/use-theme';

export default function OnlineScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { me, players, serverUrl } = useGame();

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.five,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
        },
      ]}>
      <View style={styles.inner}>
        <ThemedText type="subtitle">Онлайн</ThemedText>

        {!me ? (
          <ThemedText themeColor="textSecondary">
            Вы не в игре. Войдите на вкладке «Игра», чтобы увидеть других игроков.
          </ThemedText>
        ) : (
          <>
            <ThemedText themeColor="textSecondary">
              Игроков в мире: {players.length + 1} · Сервер: {serverUrl}
            </ThemedText>

            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.cardRow}>
                <ThemedText type="smallBold">Вы ({me.username})</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  x {Math.round(me.position.x)} · y {Math.round(me.position.y)}
                </ThemedText>
              </View>
            </ThemedView>

            {players.length === 0 ? (
              <ThemedText themeColor="textSecondary">
                Пока никого рядом — позовите друга на тот же сервер.
              </ThemedText>
            ) : (
              players.map((player) => (
                <ThemedView key={player.id} type="backgroundElement" style={styles.card}>
                  <View style={styles.cardRow}>
                    <ThemedText type="smallBold">{player.username}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      x {Math.round(player.position.x)} · y {Math.round(player.position.y)}
                    </ThemedText>
                  </View>
                </ThemedView>
              ))
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
