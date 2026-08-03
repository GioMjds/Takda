# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Source of truth.** The root `CLAUDE.md` is the repo-wide entry point. This file is the mobile-only entry point and adds what is not in the root -- mobile-specific commands, the Expo Router layout, state/storage conventions, and the patterns that span multiple feature modules.

## Commands

All commands run from `mobile/`.

| Task                         | Command              |
| ---------------------------- | -------------------- |
| Install deps                 | `pnpm install`       |
| Dev server (Expo)            | `pnpm start`         |
| Open Android                 | `pnpm android`       |
| Open iOS                     | `pnpm ios`           |
| Open web                     | `pnpm web`           |
| Lint                         | `pnpm lint`          |
| Regenerate barrels           | `pnpm barrels`       |
| Reset scaffold (destructive) | `pnpm reset-project` |

The `mobile/README.md` still uses `npm install` / `npm run` snippets; the project itself uses `pnpm`.

## Project layout

```folder
mobile/
├── app.config.js              # Expo dynamic config (loads app.json + plugins)
├── app.json                   # Expo static config (icon, splash, plugins, scheme)
├── global.css                 # Tailwind 4 + NativeWind entrypoint
├── assets/                    # Fonts (Manrope family), icons, splash images
├── src/
│   ├── app/                   # Expo Router file-based routes (do NOT put barrels here)
│   │   ├── _layout.tsx        # Root layout: providers, fonts, splash, Stack
│   │   ├── +not-found.tsx     # Global not-found route
│   │   ├── index.tsx          # Entry redirect (typically into a route group)
│   │   └── (group)/           # Route groups: (auth), (business), (customer), (public), (shared)
│   ├── components/            # Shared UI primitives + cross-cutting (AuthGate, RootLinking, ThemeProvider)
│   ├── configs/               # Runtime config (fetch.ts wraps axios)
│   ├── constants/             # App-wide constants
│   ├── features/              # Feature modules (one folder per feature)
│   ├── hooks/                 # Shared custom hooks
│   ├── layouts/               # Shared layouts (BottomTabs, Header)
│   ├── lib/                   # Third-party integration glue (i18n, SSE client)
│   ├── locales/               # i18n message catalogs
│   ├── providers/             # React context providers (currently NotificationProvider)
│   ├── services/              # Cross-feature services (auth.ts, users.ts, notifications-local.ts)
│   ├── shared/                # App-local shared utils, types, and constants
│   ├── storage/               # expo-secure-store (secrets) and react-native-mmkv (app state)
│   ├── stores/                # Zustand stores (auth.ts, theme.ts)
│   ├── types/                 # Ambient types
│   ├── utils/                 # Pure util functions
│   └── index.ts               # Top-level barrel
└── tsconfig.json              # TS strict + path alias `@/*` -> `./src/*`
```

**Path alias:** `@/*` -> `./src/*` (set in `tsconfig.json`). Always use `@/...`, never relative `../../...` for cross-folder imports.

## Root layout (`src/app/_layout.tsx`)

The root layout composes the full provider tree once for the app. Order matters:

1. `AppThemeProvider` (theme context)
2. NativeWind `View` with `dark` class binding from `useThemeStore`
3. `GestureHandlerRootView` (required by `react-native-gesture-handler`)
4. `QueryClientProvider` (TanStack Query; `staleTime: 5000` is the default)
5. `SafeAreaProvider` + `SafeAreaView`
6. `RootLinking` (deep-link config)
7. `AuthGate` (gates the entire subtree on auth state)
8. `Stack` from `expo-router` with `headerShown: false`

It also boots side effects on mount: hide splash after fonts load, hydrate `useAuthStore` and `useThemeStore`, configure the Reanimated logger at `warn` level, and install a default `Notifications.setNotificationHandler`.

## Routing conventions

- File-based routes live in `mobile/src/app/`. Each route folder has `_layout.tsx` and an entry (`index.tsx` or a named route).
- **Route groups** (parentheses) organise routes by access role without appearing in the URL: `(auth)`, `(business)`, `(customer)`, `(public)`, `(shared)`. Each group has its own `_layout.tsx` that gates the subtree on auth/role state.
- `+not-found.tsx` at `app/` root is the global not-found route.
- `'use client'` is **not** used in Expo Router -- any file with hooks, state, or `expo-*` native APIs is implicitly client-side.
- The barrel generator (`pnpm barrels`) skips any directory named `app/` -- do not run barrels over the route subtree.

## State

- **Zustand** stores under `src/stores/` -- `auth.ts` (token + user + `hydrate()`), `theme.ts` (light/dark/system + `resolved` + `hydrate()`).
- **TanStack Query** (`@tanstack/react-query`) is the only server-state cache. The shared `QueryClient` lives in `_layout.tsx` with `staleTime: 5000`. Service modules under `src/services/` own the `useQuery` / `useMutation` hooks.
- **react-hook-form** + Zod (via `@hookform/resolvers`) for forms.
- **Storage**: `expo-secure-store` for tokens (`src/storage/secure.ts`); `react-native-mmkv` for non-secret app state (`src/storage/mmkv.ts`).
- Stores hydrate on app boot from `src/app/_layout.tsx` via `useEffect(() => { void useAuthStore.getState().hydrate(); hydrateTheme(); }, [])`.

## Networking

- `src/configs/fetch.ts` is a thin axios wrapper. Use it (not bare `axios`) so headers, base URL, and auth-token injection stay consistent.
- API URL and any public config keys come from `EXPO_PUBLIC_*` env vars (read via `expo-constants` / `react-native-dotenv`).
- Real-time: `src/lib/sse-client.ts` opens Server-Sent Events; pair it with the `NotificationProvider` under `src/providers/`.

## Styling

- NativeWind 5 + Tailwind 4. Class names go directly on React Native elements (`<View className="flex-1 bg-surface" />`).
- Theme tokens are defined in `tailwind.config` (or `global.css` for CSS variables) and exposed to TS via `nativewind-env.d.ts`.
- `dark:` variant is driven by the `dark` class on the root `<View>` in `_layout.tsx`, which is bound to `useThemeStore.resolved`.
- Fonts: Manrope family (Bold/Regular/Medium/etc.) loaded via `expo-font` in `_layout.tsx` and registered in `app.json`.

## i18n

- `src/lib/i18n.ts` configures `i18next` + `react-i18next`. Message catalogs live under `src/locales/`.
- `expo-localization` detects the device locale at boot.

## Barrels

- Every folder under `src/` has a generated `index.ts` via `pnpm barrels` (`scripts/generate-barrels.mjs`). They begin with `// Auto-generated barrel. Do not edit by hand.`
- The barrel generator **skips any directory named `app/`** -- do not try to barrel the route subtree.
- Cross-feature access goes through a feature's public barrel. Features do not import directly from one another; shared utilities go under `src/shared/`, `src/utils/`, or `src/hooks/`.

## EAS / native builds

- `eas.json` configures the Expo Application Services build profiles.
- `app.config.js` wraps `app.json` and lets `app.config.js` add plugins (e.g. `expo-notifications`, `expo-secure-store`) without editing the static JSON.
- Run `pnpm android` / `pnpm ios` for native builds; `pnpm start` for the Expo dev server.

## TypeScript rules

- `strict: true`. No `any`, no `// @ts-ignore`.
- Prefer `type` for plain data shapes; use `interface` for classes and DI tokens.
- Use `@/...` everywhere -- never `../../...` for cross-folder imports.
