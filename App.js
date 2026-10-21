import { useState } from 'react';
import {StyleSheet, Text, View, ScrollView, Image, ActivityIndicator, Button} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { analyzeMeal } from './src/api';

export default function App() {
  const [photo, setPhoto] = useState(null); // { uri, base64 }
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function getImage(launch) {
    setError(null);
    setResult(null);
    setPhoto(null);
    const opts = { mediaTypes: ['images'], quality: 0.9 };
    const r = launch
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets?.[0]) return;
    const asset = r.assets[0];
    // shrink to ~1 vision tile & compress: biggest token lever
    const small = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: Math.min(asset.width, 768) } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    setPhoto(small);
  }

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      setResult(await analyzeMeal(photo.base64));
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <Text style={s.title}>Calorie Scanner</Text>

        <View style={s.btns}>
          <View style={s.btn}><Button title="📷 Take Photo" onPress={() => getImage(true)} disabled={loading} /></View>
          <View style={s.btn}><Button title="🖼 Gallery" onPress={() => getImage(false)} disabled={loading} /></View>
        </View>

        {photo && (
          <>
            <Image source={{ uri: photo.uri }} style={s.img} resizeMode="cover" />
            {!result && (
              <View style={s.btn}><Button title="🔍 Analyze meal" onPress={analyze} disabled={loading} /></View>
            )}
          </>
        )}

        {loading && <ActivityIndicator size="large" style={{ marginVertical: 20 }} />}
        {error && <Text style={s.err}>⚠️ {error}</Text>}

        {result && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
            <View style={[s.card, s.total]}>
              <Text style={s.totalNum}>{result.totals.kcal} kcal</Text>
              <Text style={s.macros}>
                Protein {result.totals.protein}g · Carbs {result.totals.carbs}g · Fat {result.totals.fat}g · Fiber {result.totals.fiber}g
              </Text>
            </View>
            {result.items.map((x, i) => {
              const confColors = { HIGH: '#2e7d32', MEDIUM: '#f9a825', LOW: '#c62828' };
              return (
                <View key={i} style={s.card}>
                  <View style={s.row}>
                    <Text style={s.name}>{x.name}</Text>
                    <Text style={[s.badge, { color: confColors[x.conf] || '#888' }]}>{x.conf}</Text>
                    <Text style={[s.badge, { color: x.source === 'DB' ? '#1565c0' : '#8e24aa' }]}>{x.source}</Text>
                  </View>
                  <Text style={s.grams}>{x.grams} g</Text>
                  <Text style={s.macros}>
                    {x.n.kcal} kcal · P {x.n.protein}g · C {x.n.carbs}g · F {x.n.fat}g · Fib {x.n.fiber}g
                  </Text>
                </View>
              );
            })}
            <Text style={s.note}>
              DB = nutrition from built-in food table (deterministic) · AI = model estimate · always verify with the user
            </Text>
          </ScrollView>
        )}

        {!photo && <Text style={s.hint}>Take a photo or pick one from your gallery to get started.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 14, paddingTop: 50, backgroundColor: '#fafafa' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  btns: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  btn: { flex: 1, marginVertical: 4 },
  img: { width: '100%', height: 260, borderRadius: 12, marginBottom: 8, backgroundColor: '#eee' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginVertical: 5, elevation: 2 },
  total: { backgroundColor: '#e3f2fd', borderColor: '#1565c0', borderWidth: 1 },
  totalNum: { fontSize: 28, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', flex: 1, textTransform: 'capitalize' },
  badge: { fontSize: 11, fontWeight: '700' },
  grams: { fontSize: 13, color: '#555', marginTop: 2 },
  macros: { fontSize: 13, color: '#333', marginTop: 2 },
  err: { color: '#c62828', marginVertical: 8 },
  hint: { color: '#777', textAlign: 'center', marginTop: 30 },
  note: { color: '#999', fontSize: 11, textAlign: 'center', marginTop: 10 },
});
