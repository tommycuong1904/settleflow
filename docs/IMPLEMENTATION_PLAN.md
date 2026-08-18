# Settleflow Landing Page – Implementation Plan

## Goal
Add a landing page at the root route (`/`) that introduces the project, displays a hero section, and provides a **Launch App** button in the header that navigates to `/app`. The button optionally triggers wallet connection before navigation.

## User Review Required
- **Design mockup**: Provide visual reference (hero image, branding colors, typography) for the landing page.
- **Component location**: The header implementation lives in `components/shared/site-header.tsx`. No separate header file is needed.
- **Wallet handling**: Should the **Launch App** button automatically open the wallet connection dialog if the user is not already connected?
- **Routing path**: Confirm the target dApp route is `/app` (and that other routes like `/dashboard` and `/payouts/new` remain unchanged).

## Open Questions
- Preferred background style for the hero (dark, light, gradient, or image)?
- Should the landing page load any dynamic data (e.g., live stats) or remain static?
- Specific mobile‑responsive breakpoints and layout preferences.

## Proposed Changes
1. **Landing page**
   - The existing root page `app/page.tsx` already serves as the landing page. If additional hero styling is needed, modify this file accordingly.
2. **Update Header**
   - `components/shared/site-header.tsx` now renders the **Launch App** button only when `pathname === '/'`. All other header elements (logo, navigation, role switcher) appear on every other route.
3. **Navigation logic**
   - On button click, call `await connectBrowserWallet()` (from `lib/arc/browser-wallet.ts`) then `router.push('/app')`.
4. **Styling**
   - Apply Tailwind utility classes that follow the existing design system for spacing, typography, colors, and micro‑animations.
5. **SEO**
   - Add `<title>SettleFlow – Decentralized Settlement</title>` and relevant meta description/OG tags in the landing page (`app/page.tsx`).
6. **Routing verification**
   - Ensure `/` maps to the landing page (`app/page.tsx`), `/app` maps to `app/app/page.tsx`, and existing pages (`/dashboard`, `/payouts/new`) continue to work.

## Verification Plan
### Automated Tests
- Start the dev server (`npm run dev`) and open `http://localhost:3000/` to confirm the landing page loads correctly.
- Click the **Launch App** button and verify navigation to `/app` and that wallet connection is prompted if required.
- Verify `/dashboard` and `/payouts/new` still render correctly.
- Run `npm run lint` and `npm run build` to ensure no linting or compilation errors.

### Manual Verification
- Check the hero section matches the provided design on both desktop and mobile viewports.
- Ensure the button’s visual style aligns with the existing design system (spacing, colors, hover animations).
- Verify SEO meta tags are present in the page source.

**After your approval, the above steps will be carried out.**
