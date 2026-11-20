# Third-party notices

Schwung is built on open-source software. Everything shipped inside the app is listed here with its licence; the
full licence texts are in each package (`node_modules/<package>/LICENSE`) and its repository. Development tools
(Jest, ESLint, Prettier, TypeScript, the Expo CLI and their dependencies) are not part of the app.

## In the app

| Component | Licence |
| --- | --- |
| Expo SDK 58 and its modules: `expo`, `expo-router`, `expo-constants`, `expo-file-system`, `expo-font`, `expo-haptics`, `expo-image`, `expo-linear-gradient`, `expo-linking`, `expo-localization`, `expo-media-library`, `expo-notifications`, `expo-sharing`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui` | MIT |
| React 19 and React Native 0.88 | MIT |
| `react-native-reanimated`, `react-native-worklets` (Software Mansion) | MIT |
| `react-native-gesture-handler`, `react-native-screens` (Software Mansion) | MIT |
| `react-native-svg` | MIT |
| `react-native-safe-area-context` | MIT |
| `react-native-view-shot` | MIT |
| `@react-native-async-storage/async-storage` | MIT |
| `zustand` | MIT |
| `react-native-purchases` (RevenueCat), with RevenueCat's iOS SDK and PurchasesHybridCommon | MIT |
| `@expo/vector-icons` | MIT |
| — Ionicons (icon font, used throughout) | MIT |
| — Material Design Icons by Pictogrammers (`MaterialCommunityIcons`, the Journey tab's mountain) | Apache 2.0 |

`react-native-purchases` is a native module: it is linked in development and App Store builds, not in Expo Go.

## Artwork

The paintings (the world, the habit cards' scenes, the collectibles, the discoveries and the summit beacon in
`assets/`) were generated with OpenAI's ChatGPT image tools for this app, then cropped, graded and compressed for
it (`design/`). They are not third-party stock art. The prompts and working files are in `design/`.

## Fonts

None are bundled: text uses the system fonts (SF Pro and the system's fonts for other scripts).
