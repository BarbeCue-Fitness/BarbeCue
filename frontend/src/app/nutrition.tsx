import { Ionicons } from '@expo/vector-icons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/page-header';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { analyzeMeal, hasGeminiKey, type MealItem, type MealResult } from '@/features/nutrition/scanner';
import { useTheme } from '@/hooks/use-theme';

type Photo = { uri: string; base64: string };

export default function NutritionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [result, setResult] = useState<MealResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (source: 'camera' | 'library') => {
    setError(null);
    setResult(null);
    setPhoto(null);

    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Camera permission is required to scan a meal.');
          return;
        }
      }

      const picked = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (picked.canceled || !picked.assets?.[0]) return;

      const asset = picked.assets[0];
      // Shrink to one vision tile (~258 tokens) before upload: the biggest cost lever.
      const context = ImageManipulator.manipulate(asset.uri);
      if (asset.width > 768 && asset.height > 0) {
        context.resize({ width: 768, height: Math.round((asset.height * 768) / asset.width) });
      }
      const rendered = await context.renderAsync();
      const small = await rendered.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
      if (!small.base64) {
        setError('Could not read that photo. Try another one.');
        return;
      }
      setPhoto({ uri: small.uri, base64: small.base64 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open that photo.');
    }
  };

  const analyze = async () => {
    if (!photo) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await analyzeMeal(photo.base64));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <PageHeader title="Nutrition scanner" subtitle="Photo → calories and macros" onBack={() => router.back()} />

          {!hasGeminiKey ? (
            <View style={[styles.notice, { backgroundColor: theme.backgroundSelected }]}>
              <Ionicons name="key-outline" size={18} color={theme.accent} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                Add <ThemedText type="code">EXPO_PUBLIC_GEMINI_API_KEY</ThemedText> to frontend/.env and restart the dev server to enable scanning.
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              label="Take photo"
              onPress={() => void pick('camera')}
              disabled={loading}
              leading={<Ionicons name="camera-outline" size={18} color={theme.onAccent} />}
              style={styles.flex}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose a photo from your gallery"
              accessibilityState={{ disabled: loading }}
              disabled={loading}
              onPress={() => void pick('library')}
              style={({ pressed }) => [
                styles.secondary,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <Ionicons name="images-outline" size={18} color={theme.text} />
            </Pressable>
          </View>

          {photo ? <Image source={{ uri: photo.uri }} style={[styles.photo, { backgroundColor: theme.imagePlaceholder }]} resizeMode="cover" /> : null}

          {photo && !result && !loading ? <PrimaryButton label="Analyze meal" onPress={() => void analyze()} /> : null}

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={theme.accent} />
              <ThemedText type="small" themeColor="textSecondary">Reading your plate…</ThemedText>
            </View>
          ) : null}

          {error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
          ) : null}

          {result ? <ResultView result={result} /> : null}

          {!photo ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Frame the whole plate with a fork, hand or cup for scale — portion estimates use those as reference.
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ResultView({ result }: { result: MealResult }) {
  const theme = useTheme();
  const { totals } = result;

  return (
    <View style={styles.results}>
      <View style={[styles.totalCard, { backgroundColor: theme.backgroundSelected, borderColor: theme.accent }]}>
        <ThemedText type="title" themeColor="accent">{totals.kcal} kcal</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Protein {totals.protein} g · Carbs {totals.carbs} g · Fat {totals.fat} g · Fiber {totals.fiber} g
        </ThemedText>
      </View>

      {result.items.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">No food detected. Try a clearer photo.</ThemedText>
      ) : null}

      {result.items.map((item, index) => (
        <ItemCard key={`${index}-${item.name}`} item={item} />
      ))}

      <ThemedText type="caption" themeColor="textSecondary" style={styles.note}>
        DB = built-in food table (deterministic) · AI = model estimate. Portions are estimates, not measurements.
      </ThemedText>
    </View>
  );
}

function ItemCard({ item }: { item: MealItem }) {
  const theme = useTheme();
  const confidenceColor = item.confidence === 'HIGH' ? theme.success : item.confidence === 'LOW' ? theme.danger : theme.textSecondary;

  return (
    <View style={[styles.itemCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.itemRow}>
        <ThemedText type="smallBold" style={styles.flex}>{item.name}</ThemedText>
        <ThemedText type="caption" style={{ color: confidenceColor }}>{item.confidence}</ThemedText>
        <ThemedText type="caption" themeColor={item.source === 'DB' ? 'accent' : 'textSecondary'}>{item.source}</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">{Math.round(item.grams)} g</ThemedText>
      <ThemedText type="small">
        {item.kcal} kcal · P {item.protein} g · C {item.carbs} g · F {item.fat} g · Fib {item.fiber} g
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  notice: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start', padding: Spacing.two, borderRadius: Radius.medium },
  actions: { flexDirection: 'row', gap: Spacing.two },
  secondary: {
    width: 52,
    minHeight: 52,
    borderRadius: Radius.round,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  photo: { width: '100%', height: 240, borderRadius: Radius.medium },
  loading: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  hint: { textAlign: 'center', paddingHorizontal: Spacing.three },
  results: { gap: Spacing.two },
  totalCard: { gap: Spacing.half, padding: Spacing.three, borderRadius: Radius.large, borderWidth: 1 },
  itemCard: { gap: Spacing.half, padding: Spacing.three, borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  note: { textAlign: 'center', paddingTop: Spacing.one },
});
