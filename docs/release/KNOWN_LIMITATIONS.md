# Known Limitations

## Not Yet Validated In This Workspace

- Android emulator runtime
- Android physical device runtime
- iPhone Expo Go runtime
- EAS cloud build execution
- Live OpenAI response with a real backend key

## Device Integrations

The app currently uses mock device data. The architecture has provider labels for Apple Watch, Google Fit, Samsung Health, and Fitbit, but does not yet include:

- Health Connect permissions
- Apple Health native bridge
- Fitbit OAuth
- Samsung Health SDK integration

## Environment Placeholders

Staging and production env files include placeholder URLs and secrets. Replace them in local secret files or deployment settings before release.

## Dependency Audit

Audit advisories currently include Expo/EAS build-chain dependencies. Review `DEPENDENCY_DECISIONS.md` before production release.
