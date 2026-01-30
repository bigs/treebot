# Onboarding workflow

Onboarding is a two-step, first-run flow that creates the admin user and captures provider API keys.

## Entry behavior

- `/` redirects to `/onboarding` if `users` table is empty.
- `/onboarding` redirects to `/onboarding/step-1`.

## Step 1: Create admin

**Route:** `/onboarding/step-1` (`src/app/onboarding/step-1/page.tsx`)

- Checks `getUserCount()`; if any user exists, redirects to `/login`.
- Renders `CreateAdminForm`.

`CreateAdminForm` (`src/app/onboarding/step-1/create-admin-form.tsx`) submits to the `createAdmin` server action:

- Validates username and password.
- Ensures no user exists before and after hashing.
- Creates the first user with `isAdmin = true`.
- Creates a session cookie and redirects to step 2.

## Step 2: Add API keys

**Route:** `/onboarding/step-2` (`src/app/onboarding/step-2/page.tsx`)

- Requires an active session; otherwise redirects to `/login`.
- Loads existing provider keys for the user to show saved state.

`ApiKeyForm` (`src/app/onboarding/step-2/api-key-form.tsx`) submits to `saveApiKeys`:

- Only admins can save keys.
- Accepts Google and/or OpenAI keys.
- Encrypts each key at rest and upserts per user + platform.
- Enables “Continue” once at least one key is saved.
