Use this as your basic Expo dev workflow.

One-time setup

cd D:\Projects\LifeSync\App
npx expo install expo-dev-client
npx eas login
npx eas build:configure
Create a development build
Android device/emulator:

cd D:\Projects\LifeSync\App
npx eas build -p android --profile development
If you want local native run instead of cloud:

cd D:\Projects\LifeSync\App
npx expo run:android
Start the dev server

cd D:\Projects\LifeSync\App
npx expo start
Useful variants:

npx expo start -c
npx expo start --tunnel
npx expo start --dev-client
Open on device/emulator
After npx expo start:

press a for Android emulator
scan QR from your phone if your dev build is installed
When you need to rebuild the dev app
Rebuild only after native changes, for example:

adding/removing Expo native packages
changing app.json
changing Android/iOS native config
Rebuild command:

cd D:\Projects\LifeSync\App
npx eas build -p android --profile development --clear-cache
For release APK

cd D:\Projects\LifeSync\App
npx eas build -p android --profile preview
For local day-to-day work
Usually just:

cd D:\Projects\LifeSync\App
npx expo start
Official Expo docs:

Development builds
Create a development build on EAS
Use a development build
Expo CLI