# Healthy You Closed Beta Distribution Guide

## Beta Artifact

- Beta version/tag: `v0.26.0-alpha`
- APK path: `C:\Users\SAKSHAM GUPTA\Desktop\healthy-you\healthy-you\android\app\build\outputs\apk\release\app-release.apk`
- APK SHA256: `37C22335DEBB025727B518D0617C2670D8ED9F70E2AFA3EBD3737066206F14C8`
- Backend URL: `https://healthy-you-staging-backend.onrender.com`
- Android package: `com.healthyyou.app`

Use only this APK artifact for the first closed beta distribution unless a patch build is explicitly approved.

## Target Tester Group

Start with a small closed beta group selected by the project owner:

- Internal owner and maintainer smoke testers.
- Trusted Android testers with known devices.
- A small wellness tracking feedback group comfortable with staging software.
- Testers who agree not to enter highly sensitive medical details.

Recommended starting size: 5 to 15 testers. Expand only after the first monitoring pass confirms install, login, and crash results are stable.

## Distribution Method Options

Options:

- Private cloud storage link with restricted access.
- Direct transfer to approved testers.
- Internal device management or app distribution tooling, if already available.
- Google Play internal testing in a later operational phase.

Recommended safe method for this phase:

- Share a restricted-access download link only with approved testers.
- Share the APK SHA256 in the same message or beta packet.
- Include `docs/beta-tester-instructions.md`, `docs/beta-known-limitations.md`, and `docs/beta-feedback-template.md`.
- Keep a list of testers who received the APK, install date, device model, and Android version.

Do not post the APK in public channels.

## APK Verification

Before installing, testers should verify:

- The APK came from the approved closed beta channel.
- The version/tag provided by the project owner is `v0.26.0-alpha`.
- The SHA256 provided by the project owner is `37C22335DEBB025727B518D0617C2670D8ED9F70E2AFA3EBD3737066206F14C8`.

If a tester can compute a hash on their device or desktop, it must match the SHA256 above. If they cannot compute the hash, they should at minimum confirm the APK came from the approved distribution link.

## Install Steps

1. Download the APK from the approved closed beta link.
2. Allow installation from the trusted source if Android prompts for it.
3. Install the APK.
4. Open Healthy You.
5. Register a new beta test account or log in with an assigned account.
6. If Health Connect permission appears, testers may allow or deny it. Denying it should not block beta testing.
7. Record device model, Android version, and install result.

If installation fails, testers should capture the Android error text and report the device model, Android version, and whether the APK came from the approved link.

## Account Setup

Testers may either:

- Register a new account using an email they are comfortable using for beta testing.
- Use an assigned beta account provided by the project owner.

Do not share passwords in screenshots, messages, feedback forms, or logs.

## First Flows To Test

Ask testers to start with:

1. Launch app and register or log in.
2. Open Home/Data and inspect Daily Briefing and Weekly Summary.
3. Open Nutrition and log a simple local meal or hydration entry.
4. Open Fitness and mark a workout complete if available.
5. Open Schedule and mark a habit or medication card.
6. Open Profile and review privacy/data controls.
7. Open Export Local Data and confirm the preview opens.
8. Open Medibot and send a short text question.
9. Close and reopen the app to confirm the session remains stable.

## What Testers Should Not Expect Yet

The following are intentionally deferred and should not be treated as beta bugs unless they crash, mislead, or expose unsafe behavior:

- Food Scan.
- Voice input.
- File or image attachments.
- Push notifications and reminder delivery.
- Calendar integration.
- Backend account deletion.
- Live OpenAI-backed responses while staging reports OpenAI is not configured.

## Safety And Privacy Reminder

Healthy You is not medical advice and is not for emergencies.

Testers should not enter:

- Urgent symptoms.
- Highly sensitive medical records.
- Medication decision requests.
- Government IDs.
- Financial information.
- Passwords or secrets in Medibot.
- Anything they would not want visible in a screenshot.

Screenshots and videos should hide passwords, private records, tokens, and sensitive medical details.

## Known Limitations

Use `docs/beta-known-limitations.md` as the source of truth for expected limitations during this closed beta.

Important beta limitations:

- Core nutrition, hydration, fitness, habit, and medication logs are local-only.
- Local wellness reset does not delete the backend account.
- Closed beta uses staging infrastructure.
- Production backend rollout and production monitoring remain future work.

## Feedback Submission Flow

Testers should submit issues using `docs/beta-feedback-template.md`.

Each report should include:

- Tester ID or name.
- Device model and Android version.
- App build/version tag: `v0.26.0-alpha`.
- Screen or feature tested.
- Steps to reproduce.
- Expected result.
- Actual result.
- Severity and frequency.
- Screenshot or video if safe.
- Whether logcat is available for crashes.

The triage owner should copy accepted issues into `docs/beta-issue-tracker-template.md` or the project issue tracker using the same fields.

## Support And Escalation

Use this escalation model:

- P0 blocker: stop or pause distribution until the owner reviews the issue.
- P1 major: triage within one beta day and decide whether a patch is needed.
- P2 minor: batch for the next beta patch or post-beta polish.
- P3 feedback: collect for roadmap and UX planning.

Examples of P0 issues:

- APK cannot install for most testers.
- App crashes on launch.
- Login/register is blocked for all testers.
- Sensitive tokens or passwords are exposed.
- Supported beta flows corrupt or delete data unexpectedly.

For P0 issues, collect tester device details, exact time, reproduction steps, screenshots if safe, and app-specific logcat when available.
