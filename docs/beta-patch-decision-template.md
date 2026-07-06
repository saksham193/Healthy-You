# Healthy You Beta Patch Decision Template

Use this template when deciding whether a live closed beta issue requires a patch APK.

## Decision Summary

- Decision ID:
- Date:
- Decision owner:
- Related issue ID:
- Current APK version/tag: `v0.26.0-alpha`
- Current docs checkpoint: `v0.27.0-alpha`
- Target patch tag:
- Patch required: yes / no / pending

## Issue Summary

- Summary:
- Severity: P0 / P1 / P2 / P3
- Affected screen/feature:
- First reported by:
- Date first reported:
- Number of affected testers:
- Affected devices:
- Affected Android versions:

## Reproduction Confidence

- Reproduced internally: yes / no / not tried
- Reproduced by multiple testers: yes / no / unknown
- Reproduction steps:
  1.
  2.
  3.
- Evidence available: screenshot / video / logcat / backend logs / none
- Confidence: high / medium / low

## Impact Assessment

- Backend or app-side issue: backend / app / both / unknown
- Supported beta feature affected: yes / no
- Deferred Phase 5 feature affected: yes / no
- Privacy or safety concern: yes / no
- Data loss or corruption concern: yes / no
- Login/install/launch affected: yes / no
- Workaround available: yes / no
- Workaround details:

## Patch Decision

- Patch required: yes / no
- Rationale:
- If no patch, disposition: known limitation / defer to Phase 5 / monitor / close
- If patch, proposed fix scope:
- Files or systems likely affected:
- Risk of fix:
- Patch owner:

## Validation Required Before Patch Release

- [ ] TypeScript validation.
- [ ] Android release build.
- [ ] APK install test.
- [ ] Smoke test affected flow.
- [ ] Regression smoke test Home/Data, Nutrition, Fitness, Schedule, Profile, and Medibot.
- [ ] Backend health/status check if backend-related.
- [ ] App-specific logcat scan.
- [ ] APK SHA256 recorded.
- [ ] Tester release notes prepared.

## Release Notes For Testers

Draft tester-facing note:

- What changed:
- Who should install the patch:
- Whether existing testers must reinstall:
- Known limitations unchanged:
- New APK SHA256:
- Support contact:

## Follow-Up

- Owner:
- Due date:
- Status:
- Fixed in tag:
- Closed date:
