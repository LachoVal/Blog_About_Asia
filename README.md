# Blog About Asia

A multi-page travel blog web app focused on Asian destinations, built with Vite and Supabase.

## Tech Stack

- Vite (multi-page setup)
- Vanilla JavaScript + CSS
- Supabase (`@supabase/supabase-js`)
- Bootstrap

## Features

- User authentication (register/login)
- Public posts and destination content
- Post details and comments
- Favorites system
- Admin area for moderation/management
- Seed script for demo users and starter content

## Project Structure

```text
.
├─ index.html
├─ post.html
├─ destinations.html
├─ country-articles.html
├─ my-posts.html
├─ posts/
│  └─ index.html
├─ login/
│  └─ index.html
├─ register/
│  └─ index.html
├─ admin/
│  └─ index.html
├─ create-post/
│  └─ index.html
├─ favorites/
│  └─ index.html
├─ src/
│  ├─ components/
│  ├─ lib/
│  └─ router/
├─ migrations/
├─ supabase/
│  └─ migrations/
└─ seed.js
```

## Prerequisites

- Node.js 18+
- npm
- A Supabase project (or local Supabase CLI stack)

## Environment Variables

Create a `.env` file in the project root.

### Frontend (used by Vite)

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Seed script (used by `npm run seed`)

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

> `SUPABASE_SERVICE_KEY` is also supported as an alternative name.

## Install & Run

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build production assets:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Database Setup (Supabase)

Apply SQL migrations from either:

- `migrations/`
- `supabase/migrations/`

(They currently mirror each other in this repository.)

If you use Supabase CLI, a typical flow is:

```bash
supabase start
supabase db reset
```

Then seed data:

```bash
npm run seed
```

The seed script creates demo users, profiles, countries, posts, comments, and favorites.

## Main Routes

- `/` → Home
- `/post.html` → Single post view
- `/destinations.html` → Destinations
- `/country-articles.html` → Country posts
- `/my-posts.html` → User’s posts
- `/posts/:id` → Rewritten to `/posts/index.html?id=<id>` by Vite plugin
- `/login` → Login page
- `/register` → Register page
- `/admin` → Admin page
- `/create-post` → Create post page
- `/favorites` → Favorites page

## Notes

- Route rewrites are configured in `vite.config.js` for friendly URLs like `/login`, `/register`, `/admin`, and `/posts/:id`.
- Ensure Row Level Security policies and storage buckets are applied through migrations before running the app in production.
