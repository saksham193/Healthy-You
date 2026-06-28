# Device Testing

## Required Matrix

Android:

- Android emulator through Expo Go or development build
- Android physical device through Expo Go
- Android preview APK from EAS

iOS:

- iPhone through Expo Go when available
- iOS simulator/development build when Apple tooling is available

## Checklist

Validate each target:

- App startup
- Bottom tabs
- Floating Medibot visibility and tap behavior
- Nutrition tabs and food modal
- Fitness recommendations modal
- Chat keyboard and send button
- Schedule scroll and quick add feedback
- Profile connected devices
- Safe areas
- Portrait orientation
- Offline startup with existing mock/local data
- Auth register/login/logout when backend is reachable
- Session restore after app restart

## Physical Device API URL

Physical devices cannot use `localhost` for the backend. Use a LAN URL:

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:4000
```

The backend must listen on an address reachable from the device and allow the mobile origin.

## Blockers To Record

- Device model and OS version
- Expo Go or build profile
- API URL used
- Crash logs
- Screenshots of clipped layouts or inaccessible buttons
