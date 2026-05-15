# Mobile App Dependency Manifest: LifeSync

This document serves as the "Golden Reference" for the LifeSync Mobile App dependencies. It ensures that any future developer or automated system can restore the app to its exact working state.

## 🛠 Core Framework & Environment
| Package | Version | Description |
|:---|:---|:---|
| **expo** | `~54.0.33` | The core SDK. The `~` means it will only accept patch-level updates (e.g., 54.0.34) to ensure stability. |
| **react** | `19.1.0` | The primary UI library. Fixed version to prevent breaking changes in React 19. |
| **react-native** | `0.81.5` | The underlying mobile framework. |
| **expo-router** | `~6.0.23` | Handles file-based navigation (the `app` directory structure). |

## 📦 Navigation & Layout
| Package | Version | Description |
|:---|:---|:---|
| **@react-navigation/native** | `^7.0.0` | Base navigation logic for moving between screens. |
| **react-native-screens** | `~4.16.0` | Optimizes screen memory usage and performance. |
| **react-native-safe-area-context**| `~5.6.0` | **CRITICAL:** Handles notches, status bars, and physical device constraints. |
| **react-native-gesture-handler** | `~2.28.0` | Handles touch interactions, swipes, and pinches. |

## 📊 Data & Storage
| Package | Version | Description |
|:---|:---|:---|
| **axios** | `^1.7.9` | Handles all API requests to the LifeSync Backend. |
| **@react-native-async-storage/async-storage** | `^2.2.0` | Used for large data persistence (User Profile, cached logs). |
| **expo-secure-store** | `~15.0.8` | Used for sensitive data ONLY (Auth tokens). |
| **expo-linking** | `~8.0.12` | Handles deep linking (e.g., opening the app from a web link). |

## 🎨 UI & Visualization
| Package | Version | Description |
|:---|:---|:---|
| **lucide-react-native** | `^0.474.0` | The primary icon set used throughout the app. |
| **react-native-chart-kit** | `^6.12.2` | Renders the Glucose (CGM) and Weight charts. |
| **react-native-svg** | `15.12.1` | Required for rendering charts and custom icons. |
| **expo-linear-gradient** | `~15.0.8` | Used for premium glassmorphism and background effects. |
| **react-native-reanimated** | `~4.1.1` | Powers all smooth animations and transitions. |

## 🧬 Specialized Features
| Package | Version | Description |
|:---|:---|:---|
| **react-native-body-highlighter**| `^3.2.0` | Renders the Interactive Muscle Heatmap in the Training tab. |
| **react-native-calendars** | `^1.1314.0` | The main date picker and history calendar view. |
| **expo-image-picker** | `~17.0.11` | Allows users to upload profile pictures or log food photos. |
| **expo-haptics** | `~15.0.8` | Provides physical vibration feedback on button presses. |
| **expo-av** | `~16.0.8` | **DEPRECATED:** Handles audio/video. Needs migration to `expo-audio` in SDK 55. |

## ⚙️ Low-Level Utilities
| Package | Version | Description |
|:---|:---|:---|
| **expo-constants** | `~18.0.13` | Accesses system-level constants (device ID, app version). |
| **expo-status-bar** | `~3.0.9` | Controls the phone's top clock/battery bar styling. |
| **react-native-worklets** | `^0.5.1` | High-performance off-thread calculation support. |
| **semver** | `^7.8.0` | Version comparison utility. |

---

### ⚠️ Version Control Rules
1. **Never use `npm install <package>` without a version.** Always use `npx expo install <package>` to get the version compatible with the current SDK.
2. **The Lockfile is King.** The `package-lock.json` file contains the exact sub-dependencies. If the app crashes after an install, revert `package-lock.json` immediately.
3. **SDK Upgrades.** When moving to Expo SDK 55+, run `npx expo install --fix` to automatically align these versions.
