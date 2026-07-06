# Healthy You Closed Beta Issue Tracker Template

Use this table for beta issue triage if a dedicated issue tracker is not already configured. Do not paste passwords, tokens, or sensitive medical details into this file.

## Severity Definitions

- P0 blocker: prevents beta distribution or core app access, causes launch crash, blocks login for most testers, creates unsafe privacy/security exposure, or causes unexpected loss/corruption of supported beta data.
- P1 major: breaks a supported beta workflow for some testers, causes repeatable screen crashes after login, causes serious data display errors, or creates confusing behavior likely to derail beta testing.
- P2 minor: non-blocking bug, awkward interaction, copy issue, device-specific layout issue, or known limitation confusion with a workaround.
- P3 polish/feedback: usability suggestion, preference, visual polish, roadmap idea, or low-risk wording improvement.

## Status Values

Suggested statuses: `New`, `Needs Info`, `Reproducing`, `Accepted`, `In Progress`, `Fixed`, `Deferred`, `Won't Fix`, `Closed`.

## Tracker

| Issue ID | Date reported | Tester ID | Device | Android version | App version/tag | Screen/feature | Severity | Status | Steps to reproduce | Expected result | Actual result | Screenshot/video | Logcat available | Owner | Resolution notes | Fixed in tag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HY-BETA-001 | YYYY-MM-DD | T-001 | Example device | Android 14 | v0.26.0-alpha | Login | P0/P1/P2/P3 | New | 1. 2. 3. | Expected behavior | Actual behavior | Yes/No | Yes/No | Owner name | Notes | Tag or N/A |

## Triage Notes

- Confirm whether the issue affects a supported beta feature or an intentionally deferred feature.
- For deferred features, file only if the copy is misleading, the action crashes, or the app behaves unsafely.
- For crashes, request app-specific logcat filtered to `com.healthyyou.app` when possible.
- For auth issues, record approximate time and backend response if visible, but never record passwords or tokens.
- For privacy/security concerns, escalate immediately as P0 until reviewed.
