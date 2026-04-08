# MedElite

MedElite is a production-minded medical education platform MVP built with `Next.js App Router`, `TypeScript`, and `Supabase` (Postgres + Storage). It supports premium student learning, instructor content operations, admin moderation, resumable media uploads, signed playback delivery, session/device controls, and practical anti-piracy deterrence.

## Product shape

- Students can browse the course catalog, preview selected lessons, subscribe, resume learning, and manage sessions/devices.
- Instructors use a creator-studio style workspace to create courses, add modules and lessons, upload video content, attach resources, and publish announcements.
- Admins can moderate users and instructors, review suspicious activity, revoke sessions, inspect audit logs, and manage site settings.

## Architecture

- `src/app`: Route groups for public, auth, student, instructor, admin, plus API handlers.
- `src/modules`: Domain services and server actions grouped by concern: `auth`, `courses`, `student`, `subscriptions`, `uploads`, `media`, `admin`, `audit`, `suspicious`, and `site-settings`.
- `src/lib`: Shared runtime glue for Supabase, env validation, storage, and error helpers.
- `supabase/migrations`: Remote database schema history and future SQL changes for MedElite.
- `scripts`: Background worker entrypoints for processing queued upload jobs.

## Security and access foundations

- Server-side role enforcement for guest, student, instructor, and admin experiences.
- Custom hashed session cookies with device fingerprinting and per-user/global session limits.
- Suspicious activity logging for session-limit and multi-session playback patterns.
- Signed short-lived playback URLs with session binding for authenticated video access.
- Dynamic forensic watermark overlay for authenticated playback.
- Audit log coverage for sign-in, moderation, settings, and upload lifecycle events.

## Honest anti-piracy posture

MedElite does **not** claim perfect screenshot or screen-recording prevention on the web. That is not realistic for browser-based video products. The current implementation focuses on practical deterrence:

- dynamic watermark overlay
- short-lived signed playback URLs
- session and device limits
- suspicious activity logging
- audit trails
- DRM-ready architecture for future integration

## Supabase setup

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Fill in your Supabase project values in `.env`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

3. Install dependencies:

```bash
npm install
```

4. Push the linked Supabase schema:

```bash
npm run db:push
```

5. Seed demo data:

```bash
npm run db:seed
```

6. Start the background worker in one terminal:

```bash
npm run worker
```

7. Start the web app in another terminal:

```bash
npm run dev
```

## Demo accounts

All seeded accounts use the password `MedElite123!`.

- `student@medelite.local`
- `dr.sara@medelite.local`
- `dr.hadi@medelite.local`
- `admin@medelite.local`

## Scripts

- `npm run dev`: start the Next.js dev server
- `npm run build`: production build
- `npm run start`: run the production server
- `npm run lint`: lint the codebase
- `npm run db:push`: push schema to the linked Supabase project
- `npm run db:seed`: seed demo data into Supabase
- `npm run worker`: run the upload processing worker loop
- `npm run jobs:once`: process queued upload jobs once

## Upload pipeline

Instructor uploads are designed around a resumable chunk workflow:

1. Instructor creates or opens a lesson draft.
2. Upload job is initialized with server-side size and MIME validation.
3. The client uploads chunks with retry support.
4. The server assembles the final file after all chunks arrive.
5. A `VideoAsset` is linked to the lesson and queued for processing.
6. The worker transitions queued uploads into ready assets.

This architecture is intentionally prepared for future transcoding, external object storage, and DRM integrations.

## Signed media delivery

- `GET /api/media/video/[assetId]/signed`
  Issues a short-lived playback URL after validating lesson access.
- `GET /api/media/video/[assetId]/stream?token=...`
  Streams the media with support for byte-range requests and session-bound playback tokens.

## Site settings

The admin settings screen reads and updates centralized JSON-backed settings for:

- access limits
- upload policy
- media security
- homepage content
- branding

## Notes and future hardening

- Stripe is intentionally not wired yet, but the subscription model and gating path are ready for a real billing provider.
- Object storage is abstracted and currently backed by Supabase Storage with private bucket access and signed server-side streaming.
- The worker currently marks queued uploads ready after storage validation; production video products should add ffprobe/transcoding and richer media metadata extraction.
