# Admin capabilities

Admin privileges are represented by the `users.is_admin` flag and carried in the session token.

## How admins are created

- The first user created through onboarding is marked as `isAdmin = true`.
- Subsequent registrations via `/register` always create `isAdmin = false`.

## Admin-only features

- **Manage provider API keys:**
  - Onboarding step 2 (`/onboarding/step-2`) is admin-only.
  - The Settings page (`/settings`) exposes the API key form only to admins.
  - Server-side enforcement lives in `saveApiKeys` (`src/lib/actions/api-key-actions.ts`).

## Invite code system

- `/register` requires a valid invite code (`invite_codes` table).
- The DB layer exposes `createInviteCode` and `redeemInviteCode` in `src/db/queries.ts`.
- There is currently no UI or API route for generating invite codes; they must be inserted through a DB tool or custom script.
