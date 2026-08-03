# Mobile Auth and Public Screens Design

Date: 2026-08-03
Status: Approved
Scope: `mobile/src/app/(public)`, `mobile/src/app/(auth)`, and the route-guard plumbing that splits users into business vs customer after login.

## 1. Background and Scope

The NestJS backend's auth and user modules are complete (`api/src/modules/auth`, `api/src/modules/users`). The mobile app (`mobile/`) is a fresh `expo-router` v57 project with route group placeholders for `(public)`, `(auth)`, `(business)`, `(customer)`, and `(shared)`. The auth service in `mobile/src/services/auth.ts` already wires `/v1/auth/*` with Zod schemas. Screen files are empty placeholders.

This spec covers:

- App-wide plumbing for the auth flow (store rewrite, AuthGate, role redirect, deep linking, 401 refresh).
- The `(public)` group: welcome, about, terms, privacy.
- The `(auth)` group: sign-in, forgot-password, reset-password, sign-up, complete-profile.
- A new `usersService` for profile updates.
- Unit tests for every screen and the gate.

Out of scope:

- Business-side screens (`(business)/*`).
- Customer-side screens (`(customer)/*`).
- New backend endpoints. The backend stays as-is.

## 2. Architecture

### 2.1 Folder structure

```folder
mobile/src/
  app/
    (public)/
      _layout.tsx
      about.tsx
      index.tsx
      privacy.tsx
      terms.tsx
      welcome.tsx
    (auth)/
      _layout.tsx
      complete-profile.tsx
      forgot-password.tsx
      otp.tsx            # reserved, not used in v1
      reset-password.tsx
      sign-in.tsx
      sign-up.tsx
    (shared)/
      not-authorized.tsx
    index.tsx            # status-based redirect
  components/
    AuthGate.tsx         # new
    FormError.tsx        # new
    RootRoleRedirect.tsx # new
    RootLinking.tsx      # new
    SubmitButton.tsx     # new
  services/
    auth.ts              # edit: add refresh-on-401 helper
    users.ts             # new
  storage/
    mmkv.ts              # edit: add userCacheStorage
    secure.ts            # edit: add refreshToken key
  stores/
    auth.ts              # rewrite to hold full UserPublic
mobile/__tests__/auth/
  auth-gate.test.tsx
  complete-profile.test.tsx
  forgot-password.test.tsx
  not-authorized.test.tsx
  reset-password.test.tsx
  sign-in.test.tsx
  sign-up.test.tsx
  welcome.test.tsx
```

### 2.2 State flow

1. App launch. Root layout mounts. `<AuthGate/>` reads `useAuthStore.status`.
2. `status === "loading"`: Gate shows the splash background. `useAuthStore.hydrate()` runs in a layout effect. It reads the access token from SecureStore and the user blob from MMKV. If the token exists and the blob is missing or fails to parse, it calls `authService.me()` once to repopulate.
3. `status === "authenticated"`: Gate mounts `<RootRoleRedirect/>`. It reads `user.role` and calls `router.replace` to the matching group.
4. `status === "anonymous"`: Gate returns `null`. Root `index.tsx` redirects to `(public)/welcome`.

### 2.3 Token and user persistence

- Access token: SecureStore, key `auth.token`.
- Refresh token: SecureStore, key `auth.refreshToken`.
- User profile (full `UserPublic`): MMKV, key `auth.user` (JSON-serialized). Non-sensitive so MMKV is fine.

### 2.4 Deep linking

Universal link `https://takda.app/reset-password?token=...` is the production target. Custom scheme `takda://reset-password?token=...` is the dev fallback. Both are registered in `app.config.js` under `expo.linking` and handled by `<RootLinking/>` in the root layout.

## 3. Components

### 3.1 AuthGate

`mobile/src/components/AuthGate.tsx`. Reads `useAuthStore(s => s.status)`. Returns:

- `loading` → centered ActivityIndicator over splash color `#208AEF`.
- `authenticated` → `<RootRoleRedirect/>` (which itself returns `null` while `router.replace` runs).
- `anonymous` → `null`.

### 3.2 RootRoleRedirect

`mobile/src/components/RootRoleRedirect.tsx`. Reads `useAuthStore(s => s.user?.role)`. On mount:

- `BusinessOwner` or `Staff` → `router.replace('/(business)/(tabs)/dashboard')`.
- `Customer` → `router.replace('/(customer)/home')`. Note: the `home.tsx` placeholder will be created in a follow-up spec; for v1 we keep this target so the redirect compiles.
- Anything else (including `SuperAdmin`) → `router.replace('/(shared)/not-authorized')`.

### 3.3 RootLinking

`mobile/src/components/RootLinking.tsx`. Subscribes to `Linking` events. On URL matching `/reset-password`, parses the `token` query param, and navigates to `/(auth)/reset-password?token=...`. Handles cold-start (app launched from a link) and warm-start (app already running).

### 3.4 FormError

`mobile/src/components/FormError.tsx`. Props: `{ message?: string; errors?: Record<string, string[]> }`. Renders a banner with the message at the top of the form and a per-field error list. The screens pass the parsed `ApiError.details` to this.

### 3.5 SubmitButton

`mobile/src/components/SubmitButton.tsx`. Props: `{ label: string; onPress: () => void; isSubmitting: boolean; disabled?: boolean }`. Renders the label, swaps in a small spinner when `isSubmitting` is true, and sets `accessibilityState={{ busy: true }}`. The button is always disabled while `isSubmitting` is true. The optional `disabled` prop lets callers wire extra rules (e.g. `formState.isValid === false`); when omitted, only the `isSubmitting` guard applies.

### 3.6 not-authorized shared screen

`mobile/src/app/(shared)/not-authorized.tsx`. Renders "Your account type isn't supported on this app" plus a "Sign out" button. Sign out calls `useAuthStore.signOut()` then `router.replace('/(public)/welcome')`.

## 4. Screens

### 4.1 (public)/welcome.tsx

- Hero: app name "Takda", one-line tagline.
- Primary CTAs: "Sign in" → `/(auth)/sign-in`, "Create business account" → `/(auth)/sign-up`.
- Footer: About, Terms, Privacy links.
- On mount, if `status === "authenticated"`, replace to the role redirect so logged-in users do not see this screen.

### 4.2 (public)/about.tsx

- Static content: product description, version from `app.json`, support email link.
- No API calls.

### 4.3 (public)/terms.tsx

- Bundled English markdown, 6–8 sections (acceptable use, account termination, liability, governing law, contact, changes).
- "Last updated YYYY-MM-DD" header.

### 4.4 (public)/privacy.tsx

- Bundled English markdown. References the fields we collect (firstName, lastName, email) and the auth tokens stored locally.

### 4.5 (public)/\_layout.tsx

- `<Stack>` with `headerShown: true`, back button visible, header title set per route. NativeWind light/dark aware.

### 4.6 (public)/index.tsx

- Status-based redirect, mirrors the root `index.tsx`. Resolves when navigating to `/` from inside the public group.

### 4.7 (auth)/sign-in.tsx

- Form: email, password. Uses `LoginSchema`.
- Submit: `authService.login(dto)`. On success, `useAuthStore.signIn(accessToken, refreshToken, user)`. AuthGate takes over routing.
- Errors: 401 → "Email or password is incorrect.", 429 → "Too many attempts. Try again in 15 minutes.", network → "Can't reach the server. Check your connection and try again.", other → backend message.
- Footer: "Forgot password?" → `/(auth)/forgot-password`. "Create business account" → `/(auth)/sign-up`.

### 4.8 (auth)/forgot-password.tsx

- Single email field. Submit: `authService.forgotPassword({ email })`. Endpoint returns 204.
- Success state: "Check your inbox" with a masked-email line.
- 429 surfaces the rate-limit message.

### 4.9 (auth)/reset-password.tsx

- Reads `token` from the URL query param. If missing, error state with "Back to sign in" link.
- Two fields: new password, confirm password. Submit: `authService.resetPassword({ token, newPassword })`.
- On success, calls `useAuthStore.signIn(...)` so the user lands in the role redirect flow.

### 4.10 (auth)/sign-up.tsx

- Five fields: first name, last name, tenant name, email, password. Uses `RegisterBusinessOwnerSchema`.
- Submit: `authService.register(dto)`. The backend creates a BusinessOwner and a tenant; response is `AuthTokens` with `role = BusinessOwner`.
- Footer: "Already have an account? Sign in" → `/(auth)/sign-in`.
- Inline line: "By creating an account, you agree to our Terms and Privacy Policy" with stack-pushed links to `(public)/terms` and `(public)/privacy`.

### 4.11 (auth)/complete-profile.tsx

- Three fields: first name, last name, optional avatar (uses `expo-image-picker`).
- Submit: `usersService.updateMe(dto)`. On success, `useAuthStore.refreshUser(updated)`.
- No OTP step. This screen is purely onboarding for accounts missing a name (defensive — backend always returns a name today).

### 4.12 (auth)/\_layout.tsx

- `<Stack>` with `headerShown: false`. Slide-from-right transition. The auth screens design their own headers.

## 5. Services and Storage

### 5.1 src/services/auth.ts

- Keep `login`, `register`, `refresh`, `forgotPassword`, `resetPassword`, `logout`, `logoutAll`, `me`. No changes to call sites.
- Add internal `refreshAccessToken()` helper used by the 401 interceptor.

### 5.2 src/services/users.ts (new)

- `updateMe(dto)` → `PATCH /v1/users/me` returns `UserPublic`.
- `findById(id)` → `GET /v1/users/:id` returns `UserPublic`.
- Uses `createEndpoint('/v1/users')`. Zod schemas match the backend `UpdateUserSchema` (we add a minimal `updateMe` schema locally since the backend's schema is for staff/owner flows).

### 5.3 src/storage/secure.ts

- Add `getRefreshToken`, `setRefreshToken`, `clearAuth` (clears both keys). Keep existing access-token helpers.

### 5.4 src/storage/mmkv.ts

- Add `userCacheStorage` with `getUser`, `setUser`, `clearUser` operating on the `auth.user` key. JSON-serializes the `UserPublic` blob.

## 6. Store Changes

`src/stores/auth.ts` is rewritten to:

- Hold `status: "loading" | "anonymous" | "authenticated"`, `accessToken: string | null`, `refreshToken: string | null`, `user: UserPublic | null`.
- `signIn(accessToken, refreshToken, user)` persists both tokens to SecureStore and the user blob to MMKV, then sets `status: "authenticated"`.
- `signOut()` clears SecureStore (both keys) and MMKV (`auth.user`), sets `status: "anonymous"`.
- `hydrate()` reads the access token from SecureStore. If absent, sets `status: "anonymous"`. If present, reads the user blob from MMKV. If the blob is present and valid, sets `status: "authenticated"`. If the blob is missing or invalid, calls `authService.me()` once to repopulate. On 401 during that call, calls `signOut()` and sets `status: "anonymous"`.
- `refreshUser(user)` re-writes the MMKV cache and updates the in-memory store.
- Re-export a `useAuthRole()` selector returning `useAuthStore(s => s.user?.role)`.

## 7. Error Handling and 401 Refresh

- `FormError` and per-field `FieldError` helpers in every form.
- A 401 interceptor inside `fetchFactory` (in `src/configs/fetch.ts`) catches a 401 response, calls `authService.refresh({ refreshToken })` once, retries the original request with the new access token. On refresh failure, calls `useAuthStore.signOut()`. The gate then routes the user to `(public)/welcome`.
- The interceptor runs once per request. Concurrent requests during a refresh are coalesced via an in-flight promise (single `refreshPromise` shared across calls).

## 8. Testing

Eight unit test files in `mobile/__tests__/auth/`, mirroring the route group:

- `sign-in.test.tsx` — invalid email shows Zod error. Valid submit calls `authService.login` once. 401 response renders the inline error. Success calls `useAuthStore.signIn` with the right token and user.
- `forgot-password.test.tsx` — submit swaps to the success state. 429 renders the rate-limit message.
- `reset-password.test.tsx` — reads `token` from URL. Mismatched passwords show the error. Matching submits. Success calls `signIn`.
- `sign-up.test.tsx` — full happy path and a validation error path.
- `complete-profile.test.tsx` — mocks `usersService.updateMe`, asserts `useAuthStore.refreshUser` called.
- `welcome.test.tsx` — both CTAs push the correct routes.
- `auth-gate.test.tsx` — three state branches using a mocked store.
- `not-authorized.test.tsx` — sign-out calls `signOut` and `router.replace`.

No E2E tests in v1.

## 9. Implementation Order

The plan skill (next) will produce the ordered task list. The rough order is:

1. Store, storage, and service changes (no UI yet).
2. Shared components (`FormError`, `SubmitButton`, `AuthGate`, `RootRoleRedirect`, `RootLinking`).
3. `(public)` screens in this order: `welcome`, then `about`/`terms`/`privacy`, then group layout.
4. `(auth)` screens in this order: `sign-in`, then `forgot-password`, `reset-password`, `sign-up`, `complete-profile`, then group layout.
5. 401 interceptor and `usersService`.
6. Tests last, one per screen plus the gate.

## 10. Risks and Open Items

- The customer `(customer)/home` route does not exist yet. The role redirect target is set but the route file will be added in a later spec. For v1, the redirect still works because expo-router resolves the deep path, and the customer-side spec will land the file.
- The 401 interceptor introduces a small amount of complexity. If the tests prove flaky, we can fall back to a simpler "refresh on the next request" model.

## 11. Prerequisites

The implementation plan cannot start until the following are in place:

- **Backend: `PATCH /v1/users/me` endpoint.** `usersService.updateMe()` in this spec calls `PATCH /v1/users/me` returning `UserPublic`. The backend (`api/src/modules/users/users.controller.ts`) does not expose this today. The implementation plan must include a parallel task to add the route to `UsersController` with the same `UpdateUserSchema` body validation, scoped so any authenticated user can update their own profile (no role guard). The mobile work for `complete-profile.tsx` and `usersService.updateMe` is blocked until that endpoint lands.
- **Apple App Site Association and Android Asset Links.** Required for `https://takda.app/reset-password` universal links to work in production. The mobile code path tolerates their absence in dev (the `takda://` fallback resolves). The implementation plan will mark these as a deploy-time prerequisite, not a blocker.
