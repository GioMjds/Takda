# 2026-08-03 — Public Screens Redesign

## Problem

The four screens under `mobile/src/app/(public)/` are visually flat and look
like placeholder test screens. The current `Welcome` is a wordmark, a one-line
subtitle, two buttons, and three text links. The current `About`, `Terms`, and
`Privacy` are walls of `gap-6` text blocks with no visual hierarchy. The
brand tokens already exist (`primary`, `accent`, `surface`, `surface-raised`,
`on-surface`, `on-surface-muted`, `shadow-card`, `radius-2xl`, Manrope display
face) but they are not being used.

## Goal

Redesign the four public screens so they feel like a finished, on-brand
product surface that matches Takda's positioning: a warm, approachable
queue and appointment platform for small walk-in businesses. Use the
existing theme tokens. No new dependencies, no new fonts, no new icon
library.

## Non-goals

- No copy changes. The legal text in `terms.tsx` and `privacy.tsx` and the
  body of `about.tsx` stays exactly as written.
- No changes to auth/business/customer route groups.
- No changes to the root `mobile/src/app/_layout.tsx`, `global.css`, or the
  API.
- No new top-level dependencies. The `lucide` / `react-native-vector-icons`
  families are intentionally not adopted here; the project doesn't carry
  them and the spec stays within the existing stack.
- No new theme tokens. We use what is already in `mobile/global.css`.

## Visual direction

Warm & approachable. Forest-green + warm-gold palette already in
`global.css`, cream `surface` background, soft `surface-raised` cards with
`shadow-card`, Manrope as the sole display face. No gradients on body
surfaces. Gold is used sparingly as a structural accent (icon circles, a
short divider rule, a vertical rule inside long-read cards).

Light and dark themes must both look intentional. Verify contrast manually
against the tokens in `global.css` (any text/background pair must hit 4.5:1).

## Architecture

### Shared shell

Add one component:

- `mobile/src/components/PublicScreen.tsx` — a thin shell that:
  - renders an `SafeAreaView` with `bg-surface`,
  - mounts an Expo Router `Stack.Screen` with `headerShown: false` so each
    screen can opt into its own header if needed (none of the four do),
  - provides a `ScrollView` with `contentContainerClassName="px-6 pb-24
pt-12 max-w-md mx-auto w-full"`,
  - exposes an optional `eyebrow`, `title`, and `subtitle` slot for the
    three long-read screens, and a `children` slot for body content,
  - uses `useSafeAreaInsets` for top padding on notched devices.

Export the new shell from `mobile/src/components/index.ts`. After adding
the file, run `pnpm barrels` from `mobile/` so any regenerated barrel
stays consistent.

### Illustrations

Three hand-authored inline-SVG components live under
`mobile/src/components/illustrations/`:

- `QueueScene.tsx` — 200×200 viewBox, two customers in line, a small
  counter, a hanging "Now serving" sign. Strokes/fills use
  `currentColor`. Dropped into the Welcome hero with `className="text-primary"`
  on the parent and a secondary `text-accent` accent.
- `CalendarGlyph.tsx`, `QueueListGlyph.tsx`, `BellGlyph.tsx` — 24×24
  glyphs for the value trio. Same `currentColor` discipline.

Why hand-drawn SVGs and not an icon library: the stack does not currently
carry one, and the spec rule is "no new top-level dependencies without
checking each app's `package.json`". These four SVGs are 60–80 lines
total and live in this spec's footprint.

### Layout per screen

#### `welcome.tsx`

Top-to-bottom inside `PublicScreen`:

1. Safe-area + `pt-12`. `Manrope-SemiBold` 24px "Takda" wordmark in
   `text-primary` with `tracking-tight`.
2. Hero block (centered, `mt-8`):
   - `QueueScene` at 200×200.
   - `Manrope-ExtraBold` 40px headline, `text-on-surface`, 2 lines:
     "Skip the line." / "Book in 10 seconds." with `leading-tight` and
     `mt-6`.
   - Subhead 16px `text-on-surface-muted` `mt-3`:
     "Run your walk-in queue. Customers scan, book, and show up. You keep
     the line moving."
3. Primary CTA: full-width, `h-14`, `rounded-2xl`, `bg-primary`,
   `active:opacity-90`. White label `Manrope-SemiBold` 16px "Sign in" with
   a right chevron. `Link` to `/(auth)/sign-in`.
4. Secondary CTA: full-width, `h-14`, `rounded-2xl`, `bg-surface-raised`,
   `border border-border`. Label `text-on-surface` "Create a business
   account". `Link` to `/(auth)/sign-up`.
5. Value trio: three `surface-raised` `rounded-xl` cards in a vertical
   stack, `gap-3`, `mt-8`. Each card: 40×40 gold-tinted icon circle on
   the left, title `Manrope-SemiBold` 15px, description `Manrope-Regular`
   13px `text-on-surface-muted`. Cards:
   - Book a slot — "Pick a time, drop your name + phone."
   - Live queue — "See your position update in real time."
   - SMS reminders — "No one forgets, no-shows drop."
6. Footer: `text-sm text-on-surface-muted` "About · Terms · Privacy",
   each text a `Link` to the corresponding sibling route. `mt-10` then
   `pb-8` (the shell's `pb-24` carries the rest).
7. Preserved behavior: the existing `useEffect` that calls
   `router.replace(BUSINESS_HOME)` when `status === "authenticated"`
   stays.

Accessibility: every CTA has `accessibilityRole="button"`. The value
cards have `accessibilityRole="summary"` and a combined
`accessibilityLabel`. The headline is `accessibilityRole="header"`.

#### `about.tsx`

Uses `PublicScreen` with `eyebrow="About"` and `title="About Takda"`.
Subtitle (in the shell's `subtitle` slot): "Queue and booking for the
businesses that keep the neighbourhood moving." — a single brand line,
not the existing one-sentence body, which moves into the body cards.

Body (one card):

- A `surface-raised` `rounded-2xl` `shadow-card` card, `p-5`.
- Inside: a 2px-wide gold vertical rule on the left (full card height)
  using `w-0.5 bg-accent-500` inside an `absolute` `left-0 top-0
bottom-0` wrapper.
- Body text 15px `leading-7` `text-on-surface`:
  "Takda is a queue and appointment platform for service businesses.
  Sign in to manage your branch, services, and customers."

Below the body card, a smaller "Talk to us" card:

- Title `Manrope-SemiBold` 15px.
- A `Linking.openURL(\`mailto:${SUPPORT_EMAIL}\`)`row that renders the
support email in`text-primary`with a right chevron; the whole row is
a`Pressable`with`accessibilityRole="link"`.
- "Version 1.0.0" muted 13px below the row.

#### `terms.tsx` and `privacy.tsx`

Both use `PublicScreen` with `eyebrow="Legal"` / `eyebrow="Privacy"`,
matching `title`, and a `subtitle` of `"Last updated · 2026-08-03"`.

The `SECTIONS` arrays in each file stay verbatim. We add a `kind`
discriminator to the `Section` type so the renderer can decide on the
dot-leader numbering and footer without forking per file. Concretely:

```ts
// mobile/src/app/(public)/types.ts
export type SectionKind = "about" | "terms" | "privacy";

export type Section = {
  kind: SectionKind;
  title: string;
  body: string;
};
```

Each entry in the file's local `SECTIONS` array gets `kind: "terms"` or
`kind: "privacy"` to match the file. The "About" screen does not use the
`SECTIONS` array — it has its own single-section body — so its body
content does not gain a `kind`.

The renderer maps each section to a card:

- Eyebrow on the card: a numbered prefix `"01."` through `"06."` in
  `Manrope-ExtraBold` 14px `text-primary`. The number is generated from
  the array index, not parsed from the existing `1.` / `2.` title
  prefix, so the visible titles become cleaner ("Acceptable use" rather
  than "1. Acceptable use"). The original "1." prefix in the `title`
  field is removed and the index-based numbering is shown instead.
- Heading: `Manrope-SemiBold` 17px `text-on-surface`.
- Body: `Manrope-Regular` 15px `leading-7` `text-on-surface` at full
  opacity (these are documents the user came to read).
- Gold 2px vertical rule on the left edge of each card, same as About.

Below the last card, a "Questions?" block:

- `surface-raised` `rounded-2xl` `p-5` card.
- "Questions about these terms?" / "Questions about your data?" header
  in `Manrope-SemiBold` 15px.
- Body in `text-on-surface-muted` 14px, with the support email inline as
  a `Linking.openURL` link.
- A back-to-welcome `Link` row at the bottom: a left chevron + "Back to
  Takda" in `text-primary`, `accessibilityRole="link"`.

### Group layout

`mobile/src/app/(public)/_layout.tsx`:

- `Stack` keeps `headerShown: false` group-wide. The in-screen hero on
  each long-read screen replaces the Stack header.
- `<Stack.Screen name="..." options={{ title, headerShown: false }} />`
  per route. `title` stays set so accessibility / future deep-linking
  keeps working.
- `headerBackTitle: "Back"` retained for the same reason; it has no
  visible effect when `headerShown: false`.

### In-screen back button

For `about` / `terms` / `privacy`, an absolute-positioned `Pressable`
sits in the top-left of the `PublicScreen` (44×44, with `top-12` and
`left-4` offsets before safe-area). Icon: a 24px chevron-left drawn as
an inline SVG (no library). On press, `router.back()`. Tinted
`text-on-surface-muted`, `active:opacity-60`. `accessibilityRole="button"`,
`accessibilityLabel="Back"`.

`welcome` does not render the back button (it is the root of the group).

## Files touched

- New: `mobile/src/components/PublicScreen.tsx`
- New: `mobile/src/components/illustrations/QueueScene.tsx`
- New: `mobile/src/components/illustrations/CalendarGlyph.tsx`
- New: `mobile/src/components/illustrations/QueueListGlyph.tsx`
- New: `mobile/src/components/illustrations/BellGlyph.tsx`
- New: `mobile/src/components/illustrations/ChevronLeft.tsx`
- Edit: `mobile/src/components/index.ts` (export the new shell)
- Edit: `mobile/src/app/(public)/_layout.tsx`
- Edit: `mobile/src/app/(public)/welcome.tsx`
- Edit: `mobile/src/app/(public)/about.tsx`
- Edit: `mobile/src/app/(public)/terms.tsx`
- Edit: `mobile/src/app/(public)/privacy.tsx`
- Edit: `mobile/src/app/(public)/types.ts` (add `kind`)

After editing `components/`, run `pnpm barrels` from `mobile/` to keep
the generated barrels in sync.

## Out of scope

- Auth screens (`sign-in`, `sign-up`, `forgot-password`, `reset-password`,
  `complete-profile`).
- Business and customer tabs.
- `not-authorized`.
- API.

## Testing / "done" criteria

- `pnpm lint` clean.
- `pnpm barrels` regenerates without error.
- Each screen renders in light and dark; visual hierarchy preserved
  (display 32–40px, body 15–16px, micro 13px).
- Welcome still routes authenticated users to
  `/(business)/(tabs)/dashboard`.
- Touch targets ≥ 44×44 on every interactive element.
- Contrast: every text/background pair passes 4.5:1 against the existing
  tokens. Verified manually for new combinations (gold-on-cream, primary
  on `surface-raised`, muted on `surface-sunken`).
- No new top-level dependencies added to `mobile/package.json`.

## Risks and trade-offs

- The legal-page restructure moves the "1." / "2." prefix out of the
  `title` field into a renderer-generated dot-leader. The visible text
  is the same; the source-of-truth shape changes. This is reversible.
- Hand-authored SVGs add ~250 lines of code that an icon library would
  replace, but they keep the dependency surface flat. If the project
  later adopts `lucide-react-native` or `react-native-vector-icons`,
  these illustrations can be swapped without changing the screens that
  consume them — the prop surface is just `className` and a size.
- `PublicScreen` owns the `Stack.Screen` declaration. This means the
  group layout can stay tiny and each screen's hero is the actual
  visible header. If the team later wants a real Stack header, the
  change is local to `PublicScreen.tsx`.
