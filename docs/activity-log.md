# Activity Log

## [2026-08-01] Fix pnpm Minimum Release Age Violation on EAS Build

### Issue

- Expo EAS Build failed during `pnpm install --frozen-lockfile` with error `[ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION]`.
- 10 packages in `pnpm-lock.yaml` (`@babel/*`, `@hookform/resolvers`, `react-hook-form`, `react-native-nitro-modules`, `baseline-browser-mapping`, `js-yaml`) were published to npm within the last 24 hours.
- EAS Build's pnpm supply-chain policy rejects packages published within the cutoff window to protect against potential malicious zero-day releases.

### Fix

- Created `.npmrc` in `app/` and root with `minimum-release-age=0` to instruct pnpm to bypass the minimum release age cutoff during remote CI builds.

## [2026-08-03] Define Staff Invitation Event Payload

### Changes

- Expanded `StaffInviteLinkEvent` payload in `src/common/events/payloads/email/staff-invite-link.event.ts` with recipient email, invite token, invite URL, role, expiration date, recipient name, inviter name, and clinic name.

