# Asian Travel Blog

Asian Travel Blog is a content-driven platform built with Vanilla JS and Supabase. Users register/login, after which they can browse published travel stories and guides categorized by different Asian countries. Regular users can submit their own travel posts (which go into a pending state), create/edit/delete their own comments under articles, and save specific posts to a personal "Favorites" list. Administrators have access to a dedicated Admin Panel where they can approve or reject pending posts, manage country categories, and moderate all comments and content across the blog.

## Architecture and Tech Stack

Classical client-server app:

  - Front-end: Vanilla JS, Bootstrap 5, HTML, CSS
  - Back-end: Supabase
  - Database: PostgreSQL
  - Authentication: Supabase Auth
  - Build tools: Vite, npm
  - API: Supabase REST API (supabase-js)
  - Hosting: Netlify (or similar)
  - Source code: GitHub

## Modular Design

Use modular code structure with separate files for different components, pages, and features. Use ES6 modules to organize the code (e.g., `api.js`, `auth.js`, `ui.js`).

## UI Guidelines

  - Use HTML, CSS, Bootstrap, and vanilla JS for the front-end. No frontend frameworks like React or Vue.
  - Use Bootstrap components (cards, modals, forms, grid) and utilities to create a responsive and user-friendly interface.
  - Implement modern, responsive UI design, with semantic HTML.
  - Use a consistent color scheme and typography throughout the app (Asian-inspired or travel theme).
  - Use appropriate icons, effects, and visual cues to enhance usability.

## Pages and Navigation

  - Split the app into multiple pages: login, registration, home (approved posts list), single post view, create post form, and admin panel.
  - Implement pages as reusable components (HTML, CSS, and JS code).
  - Use routing or dynamic DOM manipulation to manage navigation between pages, with support for browser back/forward buttons.
  - Use clear URLs or URL hashes like: `/`, `/login`, `/register`, `/posts/{id}`, `/create-post`, `/admin`.

## Back-end and Database

  - Use Supabase as the back-end and database for the app.
  - Use PostgreSQL as the database with a minimum of 5 tables: `profiles`, `countries` (or categories), `posts`, `comments`, and `favorites` and etc.
  - Use Supabase Storage for file uploads (e.g., post cover images or user avatars).
  - When changing the DB schema, always use migrations to keep track of changes.
  - After applying a migration in Supabase, keep a copy of the migration SQL file in the code.
  - Never edit existing migrations after they have been applied, to avoid inconsistencies between environments -> create a new migration for any further changes to the DB schema.

## Authentication and Authorization

  - Use Supabase Auth for user authentication and authorization.
  - Implement RLS (Row Level Security) policies to restrict access to data based on user roles and permissions (e.g., only admins can update `is_approved` status; users can only delete their own comments).
  - Implement user roles with a separate DB table `user_roles` + enum `roles` (e.g., admin, user) or by keeping a `role` column directly inside a public `profiles` table.