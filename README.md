# movie-watchlist
# Reel List: Movie Watchlist

Reel List is a web app for keeping track of movies you want to watch. After creating an account, you can add movies, mark them as watched, rate them from 1 to 5 stars, edit or delete them, and search or sort your list. Each user has their own private watchlist.

**Live app:** https://reellist.netlify.app

**Demo video:** [_coming soon_](https://youtu.be/XYc1K30UJaE)

## What the app does

- **Register, log in, and log out** with email and password
- **Add movies** with a title, year, and genre (Create)
- **View your watchlist**, filtered by All, To watch, or Watched (Read)
- **Mark movies watched, rate them, and edit details** (Update)
- **Delete movies** from your list (Delete)
- **Search** by title or genre and **sort** by newest, title, year, or rating
- Users must be logged in to see or change data, and can only access their own movies

## Technologies used

- **HTML, CSS, JavaScript** for the frontend
- **Supabase** for the PostgreSQL database and user authentication
- **Supabase Row Level Security (RLS)** so each user can only read and modify their own rows
- **Netlify** for hosting the deployed app
- **Claude (Anthropic)** as the AI tool used to generate and refine the code
- **GitHub** for version control

## Project structure

```
index.html   Page layout: login/register form, add-movie form, filters, movie list
style.css    Cinema-themed styling (ticket-stub movie cards, responsive layout)
app.js       Supabase connection, authentication, CRUD functions, rendering
README.md    Project documentation
```

## Database

One table, `movies`:

| Column     | Type        | Notes                                  |
|------------|-------------|----------------------------------------|
| id         | bigint      | Primary key, auto-generated            |
| user_id    | uuid        | Owner of the movie (from Supabase Auth)|
| title      | text        | Required                               |
| year       | int         | Optional                               |
| genre      | text        | Optional                               |
| watched    | boolean     | Defaults to false                      |
| rating     | int         | 1 to 5, optional                       |
| created_at | timestamptz | Set automatically                      |

RLS policies allow a user to select, insert, update, and delete only rows where `user_id` matches their own ID.

## Setup instructions

To run your own copy:

1. **Clone the repo**
   ```
   git clone https://github.com/YOUR-USERNAME/movie-watchlist.git
   ```
2. **Create a free Supabase project** at supabase.com.
3. **Create the table.** In Supabase, open the SQL Editor and run:
   ```sql
   create table movies (
     id bigint generated always as identity primary key,
     user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
     title text not null,
     year int,
     genre text,
     watched boolean default false,
     rating int check (rating between 1 and 5),
     created_at timestamptz default now()
   );

   alter table movies enable row level security;

   create policy "view own" on movies for select using (auth.uid() = user_id);
   create policy "add own" on movies for insert with check (auth.uid() = user_id);
   create policy "edit own" on movies for update using (auth.uid() = user_id);
   create policy "delete own" on movies for delete using (auth.uid() = user_id);
   ```
4. **Turn off email confirmation** (optional, easier for testing): Authentication → Sign In / Providers → Email → disable "Confirm email."
5. **Add your keys.** In `app.js`, replace `SUPABASE_URL` and `SUPABASE_KEY` with your project's URL and publishable key (Project Settings → API Keys).
6. **Run it.** Open `index.html` in a browser. No install or build step is needed.
7. **Deploy (optional).** Drag the project folder onto Netlify's "Upload your project files" area.

## How it was built

This project was built for Engineering Design 2 using AI tools, following the Hootcamp lectures. I described what I wanted to Claude, tested the code it produced, and asked for improvements, such as adding search and sort after the core features worked. The publishable Supabase key in `app.js` is safe to expose in the browser because Row Level Security protects the data.
