import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorldMap } from '@/components/world-map';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { DEFAULT_SERVER_URL } from '@/constants/server';
import { useGame } from '@/context/game-context';
import { useTheme } from '@/hooks/use-theme';

const MOVE_STEP = 5;

function formatMoney(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { status, error, me, players, serverUrl, join, leave, move, clearError } = useGame();

  const [username, setUsername] = useState('');
  const [url, setUrl] = useState(DEFAULT_SERVER_URL);

  if (!me) {
    const connecting = status === 'connecting';

    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.loginContent,
            {
              paddingTop: insets.top + Spacing.five,
              paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
            },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.loginInner}>
            <ThemedText type="title">Black Russia</ThemedText>
            <ThemedText themeColor="textSecondary">Войдите в мир и играйте с другими людьми.</ThemedText>

            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <ThemedText type="small" themeColor="textSecondary">
                Ник
              </ThemedText>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Например, Zahar"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                style={[styles.input, { color: theme.text }]}
              />
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <ThemedText type="small" themeColor="textSecondary">
                Адрес сервера
              </ThemedText>
              <TextInput
                value={url}
                onChangeText={setUrl}
                placeholder="192.168.0.10:3000"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={[styles.input, { color: theme.text }]}
              />
            </ThemedView>

            <ThemedText type="small" themeColor="textSecondary">
              Для телефона укажите IP компьютера с сервером, например 192.168.0.10:3000.
            </ThemedText>

            {error ? (
              <Pressable onPress={clearError}>
                <ThemedView type="backgroundSelected" style={styles.errorBox}>
                  <ThemedText type="small">{error}</ThemedText>
                </ThemedView>
              </Pressable>
            ) : null}

            <Pressable
              disabled={connecting}
              onPress={() => join(url, username)}
              style={({ pressed }) => [{ opacity: pressed || connecting ? 0.6 : 1 }]}>
              <View style={styles.primaryButton}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {connecting ? 'Подключение…' : 'Войти в игру'}
                </ThemedText>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View
      style={[
        styles.flex,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + Spacing.three,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
        },
      ]}>
      <View style={styles.gameContent}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText type="subtitle">{me.username}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Денег: {formatMoney(me.money)} ₽
            </ThemedText>
          </View>
          <View style={styles.headerRight}>
            <ThemedText type="smallBold">{players.length + 1} онлайн</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {serverUrl}
            </ThemedText>
          </View>
        </View>

        <WorldMap me={me} players={players} />

        <View style={styles.controlsRow}>
          <View style={styles.dpad}>
            <View style={styles.dpadRow}>
              <DpadButton label="▲" onPress={() => move(0, MOVE_STEP)} />
            </View>
            <View style={styles.dpadRow}>
              <DpadButton label="◀" onPress={() => move(-MOVE_STEP, 0)} />
              <DpadButton label="▶" onPress={() => move(MOVE_STEP, 0)} />
            </View>
            <View style={styles.dpadRow}>
              <DpadButton label="▼" onPress={() => move(0, -MOVE_STEP)} />
            </View>
          </View>

          <View style={styles.sideColumn}>
            <ThemedText type="small" themeColor="textSecondary">
              Рядом игроков: {players.length}
            </ThemedText>
            <Pressable onPress={leave} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <ThemedView type="backgroundElement" style={styles.secondaryButton}>
                <ThemedText type="smallBold">Выйти</ThemedText>
              </ThemedView>
            </Pressable>
          </View>
        </View>

        {error ? (
          <Pressable onPress={clearError}>
            <ThemedView type="backgroundSelected" style={styles.errorBox}>
              <ThemedText type="small">{error}</ThemedText>
            </ThemedView>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function DpadButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.dpadButton,
        { opacity: pressed ? 0.5 : 1 },
      ]}>
      <ThemedView type="backgroundElement" style={styles.dpadButtonInner}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loginContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  inputWrapper: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    fontSize: 16,
    paddingVertical: Spacing.one,
  },
  primaryButton: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  gameContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerRight: {
    alignItems: 'flex-end',
    maxWidth: '50%',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dpad: {
    gap: Spacing.one,
  },
  dpadRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'center',
  },
  dpadButton: {
    width: 56,
  },
  dpadButtonInner: {
    height: 48,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideColumn: {
    gap: Spacing.two,
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  errorBox: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
