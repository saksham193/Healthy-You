# Dependency Decisions

Last reviewed: 2026-06-22

## Policy

- Do not run `npm audit fix --force` during release stabilization.
- Patch direct dependencies only when the fix is compatible with the current Expo SDK and React Native version.
- Treat dev-tool-only vulnerabilities differently from production runtime vulnerabilities, but keep them visible before release.

## Current Classification

`npm audit --json` on 2026-06-22 reports:

- Total: 29 vulnerabilities
- Low: 1
- Moderate: 22
- High: 6
- Critical: 0

### Must Fix Before Production

- Any high or critical vulnerability in production runtime dependencies.
- Any vulnerability that affects backend request handling, auth, token storage, or OpenAI proxy runtime.
- No current high finding was traced to backend request handling, JWT/session runtime, SecureStore token handling, or the OpenAI proxy runtime.

### Monitor

- Expo CLI and EAS CLI transitive advisories that affect local build tooling only.
- `eas-cli` direct high severity is caused by transitive build-chain packages including `@expo/plist`, `@xmldom/xmldom`, `minimatch`, `node-forge`, and `tar`.
- `expo` direct moderate severity is caused by Expo CLI/config build-chain packages.
- `uuid`, `xcode`, `@expo/config-*`, `@expo/prebuild-config`, and related Expo build-chain advisories when the suggested fix is a semver-major Expo downgrade or incompatible SDK change.

### Safe Ignore For This Sprint

- Dev/build-tool advisories that do not ship in the mobile bundle or backend runtime, provided the release build is generated in a trusted CI/EAS environment.
- Findings where npm suggests `expo@46.0.21` or `eas-cli@0.0.0`; those are not valid Sprint 11.9 fixes for the current Expo SDK 56 application.

## Notes

- `eas-cli` is installed as a dev dependency because Sprint 11.9 requires Android/EAS release configuration.
- Re-run `npm audit --json` before production release and reclassify after Expo/EAS publish updated compatible packages.
