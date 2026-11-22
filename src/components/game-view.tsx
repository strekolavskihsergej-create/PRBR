import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { DEFAULT_GAME_URL } from '@/constants/server';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Fullscreen 3D world. The game itself is the web build served by our Render server,
 * so the APK only hosts the WebView. Kept in a modal so the existing tabs stay untouched.
 */
export function GameView({ visible, onClose }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [visible]);

  const retry = () => {
    setFailed(false);
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={['landscape-left', 'landscape-right']}>
      <View style={styles.root}>
        <WebView
          key={attempt}
          source={{ uri: DEFAULT_GAME_URL }}
          style={styles.web}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          androidLayerType="hardware"
          overScrollMode="never"
          bounces={false}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
          onHttpError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />

        {loading && !failed ? (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator color="#ffffff" size="large" />
            <Text style={styles.text}>Загружаем мир…</Text>
            <Text style={styles.hint}>Сервер засыпает без игроков — первый запуск может занять до минуты.</Text>
          </View>
        ) : null}

        {failed ? (
          <View style={styles.overlay}>
            <Text style={styles.text}>Не удалось загрузить мир</Text>
            <Pressable onPress={retry} style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={styles.retryText}>Попробовать снова</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable onPress={onClose} style={styles.close} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#08090d',
  },
  web: {
    flex: 1,
    backgroundColor: '#08090d',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(8, 9, 13, 0.92)',
    paddingHorizontal: 32,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    color: '#a6a6b0',
    fontSize: 12,
    textAlign: 'center',
  },
  retry: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#208AEF',
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  close: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  closeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
