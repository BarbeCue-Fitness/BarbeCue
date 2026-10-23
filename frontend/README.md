# BarbeCue

BarbeCue is a gym-partner matchmaking app built with **Expo SDK 57**, React Native and Expo Router. Swipe through people who train like you, match, chat, track your week and scan a meal for calories and macros.

> Status: prototype connected to the pilot backend. Login, matching, chat and the nutrition scanner talk to the FastAPI server in `../backend`; Progress stats are still demo data. — there is no production backend, billing or moderation yet.

---

## Requirements

| Tool | Version |
| --- | --- |
| Node.js | 20 LTS or newer (22 recommended) |
| npm | 10+ (ships with Node) |
| Expo Go | latest (SDK 57) on your phone — or a development build |
| Backend running | `../backend` (FastAPI) — login/matching/chat/scanner all need it |

Everything runs from the **`frontend/`** directory. The repo root is not an npm workspace.

---

## 1. Install all dependencies

```sh
cd frontend
npm install
```

`npm install` downloads every package listed in `package.json` (Expo, React Native, Expo Router, Reanimated, image picker/manipulator, SQLite, the deck swiper, icons, etc.).

Verify the native packages match Expo SDK 57:

```sh
npx expo install --check   # lists mismatches
npx expo install --fix     # writes SDK-compatible versions
npx expo-doctor            # 21 health checks (config, versions, assets)
```

When you add a library later, always install it with `npx expo install <package>` so Expo picks the version that matches the SDK.

## 2. Configure the environment

Copy the example file and point the app at your backend (start it first — see `../backend/README.md`):

```sh
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

```dotenv
# frontend/.env
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

- On a physical device replace `localhost` with your computer's LAN IP (backend CORS already allows the Expo origins; the API URL must be reachable from the phone).
- `.env` is git-ignored; never commit it. The Gemini key lives only on the server now — the scanner calls `POST /nutrition/scan`.
- Restart the dev server after changing `.env` (`npx expo start --clear` if it does not pick the change up).

## 3. Run the app

```sh
npm start          # Expo dev server + QR code
npm run android    # open on a connected Android device/emulator
npm run ios        # macOS only
npm run web        # browser preview (development only)
```

- **Phone:** install Expo Go, scan the QR code (Android) or use the Camera app (iOS), and make sure phone and computer are on the same Wi-Fi.
- **Emulator:** press `a` for Android or `i` for iOS in the terminal.
- **Browser:** `npm run web` — good for quick UI checks; the native pickers, camera and haptics are limited there.

Every native module this app uses (`expo-image-picker`, `expo-image-manipulator`, `expo-sqlite`, `react-native-reanimated`, `@expo/ui`) is included in Expo Go, so no custom build is required to run it. If you add a library with native code later, create a development build with `npx expo run:android`.

### Demo login

Use the seeded demo account from `backend/scripts/seed.py`: **demo@barbecue.app / demopass123**, or sign up fresh (date of birth `YYYY-MM-DD`, 18+). The session persists on the device until you log out.

### Try the features

| Area | What to do |
| --- | --- |
| Discover | Swipe right to like, left to pass, up to super-like — or use the three floating buttons. Tap the card to open the full profile. |
| Options | Tap the ☰ button in the card's top-left corner to show/hide Standouts, Nearby and filter chips. |
| Matching | Like **Ishita** or **Simran** (the two mock profiles who already liked you) to trigger the "It's a match" banner. It holds for 2 s, fades out, and the Message button opens the chat. |
| Filters | Header `Matches N` chip → Matches, or Settings → Find training partners. Apply / Reset in the filter modal; More Filters adds body type, goals, diet, language, activity and interests. |
| Matches / Chat | Matches has All / New / Active / Expired tabs plus "Likes You"; the chat screen supports sending messages and the workout-invite shortcut. |
| Progress | Weekly training bars, weight trend, match activity — mock data from `getProgress()`. The nutrition scanner entry lives here. |
| Nutrition | Progress → Nutrition scanner, or Settings. Take/choose a photo, tap **Analyze meal**. The photo is resized to 768 px and sent to the backend, which calls Gemini server-side (10 scans/user/day). |
| Settings | 10 color themes, light/dark/system mode, km/mi distance units, reset filters, "My profile", log out. |

> The profile tab was removed on purpose: open your profile from **Settings → My profile**. Other people's profiles open from cards, matches and chats.

---

## Building a shareable Android APK

EAS builds in the cloud — no local Android Studio required. The `preview` profile in `eas.json` produces an installable APK.

```sh
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android
```

The app id is `com.barbecue.app`. iOS builds and store submissions use the same EAS project (`app.json → extra.eas.projectId`). Profiles other than `preview` are not configured yet.

Native folders (`ios/`, `android/`) are generated from `app.json` + config plugins — never edit them by hand.

## Checks

```sh
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npx expo-doctor     # dependency + app config health
```

No automated test suite exists yet.

---

## Project structure

```
frontend/
├─ src/
│  ├─ app/                     Expo Router screens (file = route)
│  │  ├─ (auth)/               login, sign-up, onboarding
│  │  ├─ (tabs)/               Discover, Matches, Chat, Progress, Settings
│  │  ├─ chat/[id].tsx         one-to-one chat
│  │  ├─ user/[id].tsx         other people's profiles
│  │  ├─ profile.tsx           my profile (from Settings)
│  │  ├─ filters.tsx           main filter modal
│  │  ├─ more-filters.tsx      secondary filters
│  │  ├─ nutrition.tsx         meal scanner screen
│  │  ├─ color-theme.tsx       theme picker
│  │  ├─ premium.tsx           paywall stub
│  │  └─ _layout.tsx           providers + root stack
│  ├─ components/              shared UI, native/web tab bars
│  ├─ constants/               theme tokens, filter constants
│  ├─ contexts/                settings + filter drafts
│  ├─ hooks/                   color scheme + resolved theme
│  ├─ lib/                     distance formatting, auth + settings storage
│  ├─ services/                api.ts — every backend call + session handling
│  └─ types/                   shared TypeScript models
├─ assets/branding/            icon, splash, favicon
├─ app.json                    Expo config (permissions, plugins, routes)
├─ eas.json                    EAS build profiles
└─ .env.example                environment template
```

### How data works

`src/services/api.ts` is the single seam between UI and backend: every server call, plus session persistence (`lib/auth-storage.ts` — SQLite kv-store on native, `localStorage` on web; survives app restarts until you log out). Response shapes are the camelCase dicts built by `../backend/app/serializers.py` — they are the contract.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `npx expo-doctor` flags a version | `npx expo install --fix` |
| Expo Go says the project SDK is unsupported | update Expo Go, or build a development client (`npx expo run:android`) |
| Scanner says the key is missing | create `frontend/.env`, restart with `npx expo start --clear` |
| Gemini returns 400/403 | key invalid, not enabled for Generative Language API, or quota exhausted |
| Camera does nothing on web | browsers block `launchCameraAsync`; use **library** instead |
| Log out / reset filters does nothing in the browser | React Native Web has no `Alert`; confirmations only work in Expo Go or a native build |
| Port 8081 busy | `npx expo start --port 8082` |
| Phone cannot reach the dev server | same Wi-Fi, or `npx expo start --tunnel` |

## Known limitations

- Mock backend only: no real auth, persistence, likes, uploads or moderation.
- Auth session is in memory (logging out and reloading takes you back to Discover).
- Settings (theme, units) persist on device; filter selections and swipes reset on reload.
- Progress data is fake; the nutrition scanner is an estimate, not medical advice.
- Premium/purchase flow and the ethnicity filter are placeholders.
- The Gemini key ships inside the JS bundle — prototype only.
- Web support targets development and design review, not production.
