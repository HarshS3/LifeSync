# LifeSync Dependency Reference

This file lists declared dependency versions for each workspace.

## Root (lifesync)

### devDependencies
- ajv: ^8.20.0
- ajv-keywords: ^5.1.0
- expo-router: ~4.0.22

### overrides
- react: 19.1.0
- react-dom: 19.1.0
- react-native-svg: 15.12.1

## App (Expo)

### dependencies
- @react-native-async-storage/async-storage: ^2.2.0
- @react-navigation/native: ^7.0.0
- axios: ^1.7.9
- expo: ~54.0.33
- expo-av: ~16.0.8
- expo-constants: ~18.0.13
- expo-haptics: ~15.0.8
- expo-image-picker: ~17.0.11
- expo-linear-gradient: ~15.0.8
- expo-linking: ~8.0.12
- expo-router: ~6.0.23
- expo-secure-store: ~15.0.8
- expo-status-bar: ~3.0.9
- lucide-react-native: ^0.474.0
- promise: ^8.3.0
- react: 19.1.0
- react-native: 0.81.5
- react-native-body-highlighter: ^3.2.0
- react-native-calendars: ^1.1314.0
- react-native-chart-kit: ^6.12.2
- react-native-gesture-handler: ~2.28.0
- react-native-reanimated: ~4.1.1
- react-native-safe-area-context: ~5.6.0
- react-native-screens: ~4.16.0
- react-native-svg: 15.12.1
- react-native-worklets: ^0.5.1
- scheduler: ^0.26.0
- semver: ^7.8.0

## Client (Web)

### dependencies
- @emotion/react: ^11.14.0
- @emotion/styled: ^11.14.1
- @mui/icons-material: ^7.3.6
- @mui/material: ^7.3.6
- @react-three/drei: ^9.122.0
- @react-three/fiber: ^8.18.0
- clsx: ^2.1.1
- lucide-react: ^0.542.0
- motion: ^11.18.2
- react: 19.1.0
- react-body-highlighter: ^2.0.5
- react-dom: 19.1.0
- react-hot-toast: ^2.6.0
- react-router-dom: ^7.14.1
- recharts: ^3.5.1
- tailwind-merge: ^3.3.1
- three: ^0.182.0

### devDependencies
- @eslint/js: ^9.39.1
- @types/react: ^19.0.0
- @types/react-dom: ^19.0.0
- @vitejs/plugin-react: ^4.3.1
- autoprefixer: ^10.4.21
- esbuild: ^0.21.5
- eslint: ^9.39.1
- eslint-plugin-react-hooks: ^7.0.1
- eslint-plugin-react-refresh: ^0.4.24
- globals: ^16.5.0
- postcss: ^8.5.6
- rollup: ^4.60.3
- tailwindcss: ^3.4.17
- vite: ^5.4.1

### overrides
- react: 19.1.0
- react-dom: 19.1.0

## Server (API)

### dependencies
- @xenova/transformers: ^2.17.2
- axios: ^1.15.2
- bcryptjs: ^3.0.3
- cheerio: ^1.2.0
- cors: ^2.8.5
- csv-parse: ^6.2.1
- dotenv: ^17.2.3
- express: ^5.2.1
- express-rate-limit: ^8.5.1
- jsonwebtoken: ^9.0.3
- mongoose: ^9.0.1
- multer: ^2.0.2
- node-cron: ^4.2.1
- nodemailer: ^7.0.12
- pdf-parse: ^1.1.1
- tesseract.js: ^7.0.0
- xlsx: ^0.18.5

### devDependencies
- nodemon: ^3.1.9

## Scraping

### dependencies
- csv-parse: ^6.2.1
- dotenv: ^17.4.2
- mongoose: ^9.5.0

## AI Service (Python)

### environment
- python: 3.11

### requirements.txt
- fastapi
- uvicorn[standard]
- python-dotenv
- chromadb
- pypdf
- openai
