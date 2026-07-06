# Healthy You Closed Beta Release Checklist

Use this checklist for the exact APK artifact that will be shared with closed beta testers.

## Repository And Version

- [ ] Repo clean before build.
- [ ] Latest commit verified.
- [ ] Latest tag verified.
- [ ] Rollback tag identified.
- [ ] APK file name/version recorded.
- [ ] APK build timestamp recorded.

## Android Release APK

- [ ] Android release APK built.
- [ ] APK uses staging/RC environment.
- [ ] APK points to HTTPS staging backend, not localhost.
- [ ] APK installed on test device or emulator.
- [ ] App launches successfully.

## Backend Staging

- [ ] Staging backend health check passes.
- [ ] Staging backend status check passes.
- [ ] `/status` environment is `staging`.
- [ ] Register tested with a throwaway beta QA user.
- [ ] Login tested with the same user.
- [ ] Invalid login returns a safe failure.
- [ ] Backend monitoring/log access confirmed.
- [ ] Render persistent disk attachment reviewed.

## App Smoke Test

- [ ] Home/Data tab smoke tested.
- [ ] Nutrition tab smoke tested.
- [ ] Fitness tab smoke tested.
- [ ] Schedule tab smoke tested.
- [ ] Profile tab smoke tested.
- [ ] Medibot/Assistant tab smoke tested.
- [ ] Medibot text input/send tested.
- [ ] Profile export preview opens.
- [ ] Clear Local Wellness Data confirmation works.
- [ ] User remains logged in after local wellness reset.

## Runtime Hygiene

- [ ] App-specific logcat scan checked for crashes.
- [ ] No `FATAL EXCEPTION` for `com.healthyyou.app`.
- [ ] No app-specific ANR.
- [ ] No obvious token/password leakage in logs.
- [ ] No raw sensitive wellness payloads printed in logs.

## Beta Documentation

- [ ] Tester instructions ready.
- [ ] Known limitations reviewed.
- [ ] Feedback template ready.
- [ ] Safety/privacy notes reviewed.
- [ ] Deferred features clearly listed.
- [ ] Distribution guide ready.
- [ ] Issue tracker template ready.
- [ ] Monitoring checklist ready.
- [ ] Feedback summary template ready.
- [ ] APK SHA256 shared with testers.

## Tester Operations

- [ ] Beta tester list prepared.
- [ ] Distribution channel ready.
- [ ] Feedback channel ready.
- [ ] Triage owner assigned.
- [ ] P0 escalation path defined.
- [ ] Post-beta review plan ready.
- [ ] First-wave tester size selected.
- [ ] Tester device and Android version tracking prepared.
- [ ] Daily backend monitoring owner assigned.
- [ ] Patch decision owner assigned.

## Final Gate

- [ ] No P0 blockers open.
- [ ] Known P1 items accepted or fixed.
- [ ] Release owner approves distribution.
- [ ] Rollback plan shared with maintainers.
