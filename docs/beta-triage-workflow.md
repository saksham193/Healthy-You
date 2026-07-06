# Healthy You Closed Beta Triage Workflow

Use this workflow for live closed beta reports against the `v0.26.0-alpha` APK.

## Feedback Intake Steps

1. Receive report from feedback channel, form, or direct tester message.
2. Confirm the tester included device model, Android version, app version/tag, screen/feature, steps, expected result, and actual result.
3. Remove or redact passwords, tokens, medical records, or other sensitive details before copying into an issue tracker.
4. Assign or create an issue ID using `HY-BETA-###`.
5. Add the report to `docs/beta-issue-tracker-template.md` or the project issue tracker.
6. Classify severity.
7. Assign owner and status.
8. Request additional evidence if needed.

## Severity Classification

- P0 blocker: install, launch, login, or core app access is blocked; broad crash; privacy/security exposure; unexpected supported-data loss.
- P1 major: supported beta workflow is broken for some testers; repeatable screen crash after login; serious data display error; high-confusion behavior.
- P2 minor: non-blocking bug, awkward interaction, copy issue, layout issue, or known limitation confusion with a workaround.
- P3 polish/feedback: suggestion, preference, wording feedback, visual polish, or roadmap idea.

## P0 Response Process

1. Pause distribution expansion immediately.
2. Notify beta owner, triage owner, backend monitoring owner, and patch decision owner.
3. Collect exact tester device, Android version, time, screen, reproduction steps, and safe evidence.
4. Check whether the issue reproduces on an internal device.
5. Check backend health/status if auth, sync, or API behavior is involved.
6. Request app-specific logcat if the issue is a crash and the tester can provide it.
7. Decide within the same beta day whether to pause, rollback, hotfix, or mark as non-reproducible with monitoring.
8. Do not expand the tester group until the P0 is resolved or downgraded with evidence.

## P1 Response Process

1. Assign an owner within one beta day.
2. Reproduce internally if practical.
3. Collect screenshots, video, and logcat when relevant and safe.
4. Decide whether a beta patch is needed before expanding the tester group.
5. If a workaround exists, share it with affected testers.
6. Keep issue status updated until fixed, deferred, or closed.

## Duplicate Issue Handling

- Link duplicate reports to the original issue ID.
- Keep all affected tester/device details on the original issue.
- Increase severity if duplicates show broader blast radius.
- Do not close duplicates until the original issue is triaged.

## Reproduction Checklist

Before marking an issue accepted:

- App version/tag confirmed.
- Device model and Android version captured.
- Network condition captured.
- Steps to reproduce are specific enough.
- Expected and actual results are clear.
- Known limitation status checked.
- Backend status checked if relevant.
- Crash/logcat evidence requested if relevant.

## Logcat And Screenshot Request Guide

For screenshots/videos:

- Ask testers to hide passwords, tokens, private records, and sensitive medical details.
- Ask for the smallest evidence needed to understand the issue.

For logcat:

- Prefer app-specific logs around the incident time.
- Search for `com.healthyyou.app`.
- Check for `FATAL EXCEPTION`, `ANR`, `TypeError`, `ReferenceError`, and `AndroidRuntime`.
- Treat unrelated Android system noise separately from app-specific failures.

## Patch Decision Criteria

Create a patch decision record when:

- Any P0 is confirmed.
- A P1 affects multiple testers.
- A supported beta workflow is blocked without a clear workaround.
- Backend instability blocks onboarding.
- A privacy/security issue is suspected.
- Deferred feature copy causes repeated serious confusion.

No patch is needed when:

- The report is expected deferred Phase 5 behavior and copy is clear.
- A workaround is acceptable for closed beta.
- The issue is cosmetic and low-risk.
- The report lacks reproduction detail after follow-up.

## When To Create A Hotfix Branch

Create a hotfix branch only after the patch decision owner approves a patch.

Use a hotfix branch when:

- A P0 or broad P1 requires code changes.
- The fix is small, targeted, and safe to validate quickly.
- The APK needs to be rebuilt and redistributed.

Do not create a hotfix branch for documentation-only tester guidance unless the beta owner asks for a docs patch.

## When To Defer To Phase 5

Defer to Phase 5 when the issue is about:

- Food Scan implementation.
- Voice input implementation.
- Attachment upload implementation.
- Push notification delivery.
- Calendar integration.
- Backend account deletion.
- Full production AI provider behavior.

Do not defer if the deferred action crashes, exposes unsafe copy, or blocks supported beta flows.

## When To Close As Known Limitation

Close as known limitation when:

- The behavior is listed in `docs/beta-known-limitations.md`.
- The app clearly communicates the limitation.
- The action does not crash.
- No privacy, safety, or data-loss concern exists.

Add a resolution note explaining the known limitation and link the tester to the relevant beta limitation text.
