# Phase 4B-2A Ayurveda Dosha Card Refinement Report

## 1. User Request Addressed

Updated only the three Ayurveda dosha selector cards in Nutrition -> Ayurveda:

- Vata
- Pitta
- Kapha

The selected dosha description card below the selector was not changed.

## 2. Reference Design Interpretation

The reference image was interpreted as three premium, rounded white cards with:

- A large elemental symbol near the top.
- A clear uppercase dosha label under the symbol.
- A small stylized body silhouette near the bottom.
- Distinct identity colors for each dosha.
- Clean selected state treatment without over-coloring the whole row.

The mobile implementation keeps all three cards in one row to avoid pushing the existing description card too far down.

## 3. Files Changed

- `src/components/nutrition/AyurvedaSection.tsx`
- `assets/ayurveda/dosha-vata-figure.png`
- `assets/ayurveda/dosha-pitta-figure.png`
- `assets/ayurveda/dosha-kapha-figure.png`
- `docs/phase-4b-2a-ayurveda-dosha-card-refinement-report.md`

## 4. Vata / Pitta / Kapha Card Design Details

- Vata
  - Aqua-blue accent.
  - Wind/swirl-inspired symbol using `sync-outline`.
  - Slim body silhouette.
- Pitta
  - Orange/fire accent.
  - Flame symbol using `flame-outline`.
  - Medium body silhouette.
- Kapha
  - Green earth/leaf accent.
  - Leaf symbol using `leaf-outline`.
  - Broader body silhouette.

All cards use rounded white surfaces, soft shadow, compact mobile proportions, and a selected-state border/tint.

## 5. Intentionally Left Unchanged

- Selected dosha description card below the selector.
- Existing dosha descriptions and recommendations.
- Selected-dosha behavior.
- Nutrition screen header/theme.
- Bottom tabs and floating Medibot button.
- App icon/app label.
- Data/Home, Schedule, Fitness, Profile, and Medibot styling.
- Nutrition business logic and data flow.

## 6. Validation Commands Run

- `npx.cmd tsc --noEmit`: Passed.
- `npm.cmd run typecheck`: Passed.
- `git diff --check`: Passed. Git printed CRLF normalization warnings only.
- `npm.cmd run build:android:rc:local`: Passed after rerun with network permission for the Gradle distribution/dependencies.
- `adb uninstall com.healthyyou.app`: Passed.
- `adb install android/app/build/outputs/apk/release/app-release.apk`: Passed.
- `adb shell monkey -p com.healthyyou.app -c android.intent.category.LAUNCHER 1`: Passed.
- `adb logcat -d -t 2000 | Select-String -Pattern "FATAL EXCEPTION|ANR|TypeError|ReferenceError|AndroidRuntime|ReactNativeJS|com.healthyyou.app"`: No `FATAL EXCEPTION`, `ANR`, `TypeError`, or `ReferenceError` matches from the Healthy You release pass.

## 7. Release APK Build Result

Passed.

Release artifact:

- `android/app/build/outputs/apk/release/app-release.apk`

## 8. Visual QA Result / Blocker

Blocked at authenticated navigation.

The real release APK installed and launched successfully on `emulator-5554`. The app rendered the Healthy You auth screen without crash/ANR, and a throwaway registration attempt reached the loading state. The app then showed the sanitized auth error:

`Unable to reach Healthy You services. Check your connection and try again.`

Device connectivity showed validated Wi-Fi, and the staging hostname resolved, but the staging backend was not reachable enough for registration/login from the emulator. Because authentication did not complete, Nutrition -> Ayurveda could not be reached in the real release APK.

Visual QA that could not be completed:

- Nutrition -> Ayurveda selector card inspection on the installed release APK.
- Selected Vata/Pitta/Kapha interaction on the installed release APK.
- Confirmation that the description card below the selector remains visually unchanged in the installed release APK.

Final Phase 4B-2 completion should not be claimed until authenticated release visual QA can reach Nutrition.

## 9. Remaining Polish Items

- Re-run real release APK visual QA on Nutrition -> Ayurveda when staging auth is reachable.
- Confirm Vata/Pitta/Kapha selector cards match the reference direction.
- Confirm the selected description card below the selector is unchanged.
- Confirm no clipping, unreadable text, crash, or ANR.

## 10. Phase 4B-2B Dosha Figure Refinement

User feedback addressed:

- The Phase 4B-2A lower body figure looked too blocky and awkward compared with the Ayurveda reference.
- The body types did not read naturally enough as slim Vata, balanced Pitta, and broader Kapha.
- The prior React Native block/view silhouette approach was intentionally retired rather than further refined.

Implementation approach:

- Replaced the old block-built body shapes with image-based figure assets.
- Added transparent PNG body figure assets under `assets/ayurveda`.
- The card lower body-figure area now renders a React Native `Image` inside a fixed-height figure slot.
- No new dependencies were added.
- The selected card keeps the premium tint/border treatment and now adds a very subtle scale/shadow emphasis.

Assets used:

- `assets/ayurveda/dosha-vata-figure.png`
- `assets/ayurveda/dosha-pitta-figure.png`
- `assets/ayurveda/dosha-kapha-figure.png`

Source/cropping notes:

- Used the provided per-dosha cropped reference images:
  - `vata.png.png`
  - `pitta.png.png`
  - `kapha.png.png`
- The supplied per-dosha images contained the full mini card, so the lower purple body figure was isolated from each image and exported as a transparent reusable PNG.
- Full-reference cropping from `Gemini_Generated_Image_p7srfsp7srfsp7sr.png` was not needed because the per-dosha source images were available.

Files changed for Phase 4B-2B:

- `src/components/nutrition/AyurvedaSection.tsx`
- `assets/ayurveda/dosha-vata-figure.png`
- `assets/ayurveda/dosha-pitta-figure.png`
- `assets/ayurveda/dosha-kapha-figure.png`
- `docs/phase-4b-2a-ayurveda-dosha-card-refinement-report.md`

Design details:

- Vata keeps the aqua-blue card identity and uses the narrowest figure asset for a lighter/slimmer read.
- Pitta keeps the orange/fire card identity and uses the balanced medium figure asset.
- Kapha keeps the green/leaf card identity and uses the broadest figure asset.
- The selected-state border/tint, upper symbol, label, card surface, shadow, and row layout remain intact.
- The fixed image slot avoids stretching, visible crop edges, clipping, and layout jumps.

Intentionally unchanged:

- Selected dosha description card below the selector.
- Existing dosha data, recommendations, summary copy, and selected-dosha behavior.
- Nutrition screen header/theme, bottom tabs, floating Medibot button, app icon/app label, and unrelated screens.

Validation results:

- `npx.cmd tsc --noEmit`: Passed after prepending the installed Node runtime path. The first attempt failed because `node` was not resolvable from the shell PATH.
- `npm.cmd run typecheck`: Passed after prepending the installed Node runtime path. The first attempt failed because `node` was not resolvable from the shell PATH.
- `git diff --check`: Passed. Git printed CRLF normalization warnings only.
- `npm.cmd run build:android:rc:local`: Passed after rerunning with the installed Node `v24.14.0` runtime first on PATH.

Build notes:

- The first Android build attempt used Node `v20.11.1` from nvm and failed because Expo requires Node `>=20.19.4`, producing `parseEnv is not a function` errors.
- The rerun with Node `v24.14.0` succeeded.
- Release APK generated at `android/app/build/outputs/apk/release/app-release.apk`.

Visual QA result:

- Local asset inspection passed: the three exported PNGs have transparent backgrounds and read as slim Vata, medium Pitta, and broader Kapha.
- Release APK device visual QA was not run because `adb devices` reported no attached emulator/device.
- Install, launch, Nutrition -> Ayurveda navigation, screenshot capture, and logcat checks remain pending until an emulator/device is available.

Remaining limitations:

- On-device visual QA still needs to confirm the final cards on Nutrition -> Ayurveda.
- Logcat checks for `FATAL EXCEPTION`, `ANR`, `TypeError`, and `ReferenceError` still need to run after a device is available and the APK can be launched.
