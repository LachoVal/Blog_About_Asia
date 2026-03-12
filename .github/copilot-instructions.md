# Asian Travel Blog – Copilot Instructions

## Project Context
This project is an **Asian Travel Blog** built as a **multi-page app (MPA)**.

Use this stack only:
- Frontend: HTML5, CSS3, Vanilla JavaScript (ES modules)
- UI: Bootstrap 5
- Build tool: Vite
- Backend/Auth/DB: Supabase (`@supabase/supabase-js`)
- Database: PostgreSQL

Do **NOT** use React, Vue, Angular, Next.js, or backend frameworks.

## Core App Routes
Always preserve and use these routes/pages:
- `/` (home dashboard with approved posts)
- `/login`
- `/register`
- `/posts/{id}` (or `/post.html?id={id}` depending on current routing setup)
- `/create-post`
- `/favorites`
- `/my-posts`
- `/admin`

When generating links, ensure clicking **Read** on home cards navigates to the single-post reading page.

## Folder and File Organization
Use separate folders/files for each page and shared components:
- each page should have its own HTML/CSS/JS
- shared components in dedicated modules (header/footer)
- keep JS modular and reusable (`src/lib`, `src/components`, `src/router`)

Do not collapse everything into one large file.

## Data Model (Blog Domain)
Use this domain model when generating queries and features:
- `profiles` (id -> auth.users, username, avatar_url, role)
- `countries` (travel destinations/categories)
- `posts` (title, content, image_url, country_id, author_id, is_approved)
- `comments` (post_id, user_id, content)
- `favorites` (user_id, post_id; unique pair)

`countries` are required for categorization/filtering and admin content management.

## Roles and Permissions
There are two roles in `profiles.role`:
- `user`
- `admin`

Implement logic with these rules:
- Public/home reads only approved posts (`is_approved = true`)
- Users can create posts (default pending approval)
- Users can update/delete only their own posts/comments/favorites
- Admin can approve/reject posts, manage countries, and moderate all comments/content

When writing Supabase code, always include ownership/role checks in UI + rely on RLS in DB.

## Supabase and Query Conventions
- Use `async/await` for all Supabase operations
- Always handle `{ data, error }` properly
- Show user-friendly messages for errors/empty states/loading
- Prefer explicit `select(...)` with joined relations when needed
- For single-post page, join `profiles` and `countries`
- For favorites page, fetch favorites for current user and include related post data

## Migrations and Schema Changes
- Never modify already-applied migration files
- Create a new migration for each schema change
- Keep migration SQL files in repository
- Keep `supabase/migrations` and project migrations consistent

## UI/UX Guidelines
- Build responsive UI with Bootstrap components and semantic HTML
- Keep design clean and consistent
- Use Hero + Carousel + Tabs on home page when requested
- Keep card layouts readable and mobile-friendly
- Avoid unnecessary visual complexity

## Feature-Specific Rules

### Single Post Read Page
- Resolve post ID from URL
- Render full article content and metadata
- Include favorites toggle button
- Include comments list + add/edit/delete (subject to ownership/admin)

### Edit Comment via Modal
When user clicks **Edit** on a comment:
- Open Bootstrap modal dialog
- Pre-fill textarea with current comment text
- Store `comment_id` in hidden field/state
- On save, run Supabase `update` for that comment
- Close modal and update DOM without full page reload

### My Posts
- Add `/my-posts` page for logged-in users
- Show only current user's posts (`author_id = currentUser.id`)
- Display status badge:
  - Pending when `is_approved = false`
  - Published when `is_approved = true`
- Provide Edit/Delete actions for own posts

## Output Expectations for Code Generation
When asked to generate code:
1. Follow existing project structure and naming
2. Return production-ready Vanilla JS (no pseudo-code)
3. Include complete event listeners and DOM bindings
4. Keep code small, modular, and readable
5. Do not introduce unrelated libraries or architecture changes

## Prompt Templates (for this project)

### Generate DB Schema + RLS
"Generate Supabase SQL migrations for the Asian Travel Blog with tables profiles, countries, posts, comments, favorites and RLS policies for user/admin ownership rules. Do not alter existing migrations; create a new migration file."

### Generate Seed Script
"Create/update `seed.js` to seed sample data for Asian Travel Blog: 3 users, countries, posts (approved + pending), comments, favorites. Use `@supabase/supabase-js`, async/await, and robust error handling."

### Generate Single Post Page
"Implement `post.html` + `post.js` for reading an article by URL id, with joined author/country data, favorites toggle, comments CRUD, and Bootstrap modal edit for comments."

### Generate Home Dashboard
"Implement home dashboard with Hero section, Bootstrap carousel for latest approved posts, and tabs by country that filter approved post cards."
