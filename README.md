# BarbeCue

BarbeCue is a cross-platform Expo app built with React Native and Expo Router.

## Run the app

```sh
npm install
npm start
```

Use `npm run ios`, `npm run android`, or `npm run web` to start a platform-specific session.

## Checks

```sh
npm run lint
npm run typecheck
```

## Project structure

- `src/app/` contains Expo Router screens and the root layout.
- `src/components/` contains shared UI and platform-specific tab navigation.
- `src/constants/` contains shared theme colors, type, and spacing tokens.
- `src/hooks/` contains theme and color-scheme hooks.

The project uses Expo SDK 57. Install Expo and React Native libraries with `npx expo install` so their versions stay compatible with the SDK.
