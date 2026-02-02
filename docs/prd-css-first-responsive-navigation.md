[PRD]
# PRD: CSS-First Responsive Navigation Cleanup

## Overview
Improve responsive behavior across all navigation surfaces by shifting from React-driven responsiveness to CSS breakpoints and media queries. Ensure the UI adapts immediately when resizing between desktop and mobile, reduce responsive-related React effects/listeners by 50%, and keep only minimal JS where strictly necessary (mobile drawer toggle and optional mobile keyboard handling).

## Goals
- Reduce responsive-related React effects/listeners by 50% from current baseline.
- Ensure immediate layout adaptation on viewport resize without requiring reload.
- Keep mobile sidebar toggle functional with minimal JS.
- Replace `matchMedia`-based responsive logic with CSS where feasible.

## Quality Gates
These commands must pass for every user story:
- `pnpm lint`
- `pnpm build`

## User Stories

### US-001: CSS-First Sidebar Responsiveness
**Description:** As a user, I want the sidebar layout to adapt between mobile and desktop using CSS so resizing works immediately.

**Acceptance Criteria:**
- [ ] Sidebar width, transforms, and visibility are controlled by Tailwind breakpoints (`md:`) rather than JS-driven logic.
- [ ] Resizing from desktop to mobile updates the layout instantly without a refresh.
- [ ] The sidebar remains usable on both desktop and mobile.

### US-002: Minimal-JS Mobile Drawer Toggle
**Description:** As a user, I want to open and close the mobile drawer reliably with minimal state handling.

**Acceptance Criteria:**
- [ ] The existing `mobileOpen` state is retained only for open/close.
- [ ] Overlay and close interactions continue to work on mobile.
- [ ] When resizing to mobile width, the drawer is closed by default.

### US-003: Top Bar Responsive Layout
**Description:** As a user, I want top bar actions to reflow correctly across breakpoints.

**Acceptance Criteria:**
- [ ] Top bar elements are laid out with CSS breakpoints only.
- [ ] No responsive layout changes are driven by `useEffect` or `matchMedia`.
- [ ] Layout remains consistent at `md` breakpoint and above.

### US-004: Composer and Chat Input Responsiveness
**Description:** As a user, I want the chat input/composer to behave correctly across breakpoints without JS-driven responsive logic.

**Acceptance Criteria:**
- [ ] Any `matchMedia`-based focus or layout logic is removed if CSS can replace it.
- [ ] Input sizing and spacing adjust via Tailwind breakpoints.
- [ ] Behavior remains correct on mobile and desktop without resize glitches.

### US-005: Remove `matchMedia`-Based Responsive Logic
**Description:** As a developer, I want responsive behavior driven by CSS instead of `matchMedia`.

**Acceptance Criteria:**
- [ ] `matchMedia` use for responsiveness is removed where CSS can accomplish the same behavior.
- [ ] Remaining responsive logic is CSS-first; any unavoidable JS is explicitly justified.

## Functional Requirements
- FR-1: Use Tailwind `md` breakpoint as the single source of truth for mobile vs desktop layout changes.
- FR-2: Responsive layout changes occur immediately on resize without refresh.
- FR-3: The mobile drawer defaults to closed when entering mobile width.
- FR-4: The mobile drawer toggle remains functional with minimal JS state.
- FR-5: Remove `matchMedia`-based responsive logic where feasible.
- FR-6: Keep mobile keyboard/viewport handling only if CSS-only behavior is not viable.

## Non-Goals
- No backend changes.
- No data model or schema changes.
- No new navigation features beyond responsive behavior improvements.
- No visual redesign beyond responsiveness and layout correctness.

## Technical Considerations
- Primary files likely involved: `src/components/sidebar/sidebar.tsx`, `src/components/sidebar/app-shell.tsx`, `src/components/sidebar/sidebar-context.tsx`, `src/components/assistant-ui/thread.tsx`, `src/app/(app)/ws/[workspaceId]/chats/[id]/chat-view.tsx`, `src/app/globals.css`.
- Prefer Tailwind breakpoints (`md:`) and existing utility classes over JS-driven layout changes.
- If a resize listener is required to close the drawer on shrink, keep it minimal and document why CSS-only is insufficient.
- Maintain existing accessibility attributes and ARIA labels.

## Success Metrics
- Reduce responsive-related React effects/listeners by 50% compared to current baseline.
- Remove `matchMedia`-based responsive logic in targeted components where feasible.
- Verified immediate adaptation when resizing between desktop and mobile.

## Open Questions
- Can the mobile keyboard/viewport handling in `chat-view.tsx` be replaced with CSS-only (`dvh` and safe-area insets) without regressions?
[/PRD]
