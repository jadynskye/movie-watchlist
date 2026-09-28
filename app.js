// ============================================================
// Reel List — Movie Watchlist
// Frontend talks directly to Supabase (Postgres database + Auth).
// Row Level Security policies in Supabase make sure each user
// can only read and change their own movies.
// ============================================================

// ---------- 1. Connect to Supabase ----------
const SUPABASE_URL = "https://hxywwdrxrcfvhfknltpv.supabase.co";
const SUPABASE_KEY = "sb_publishable_HUR3uH3luhjGwWLZj2bZtw_bqWq1lsi"; // publishable key: safe in the browser with RLS on
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- 2. App state ----------
let movies = [];         // movies loaded from the database
let filter = "all";      // "all" | "towatch" | "watched"
let editingId = null;    // id of the movie being edited, if any
let authMode = "login";  // "login" | "signup"

// ---------- 3. Grab page elements ----------
const $ = (id) => document.getElementById(id);
const authView = $("auth-view");
const appView = $("app-view");
const userBar = $("user-bar");

// ============================================================
// AUTHENTICATION (register, log in, log out)
// ============================================================

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  $("auth-title").textContent = signup ? "Create your account" : "Log in to your watchlist";
  $("auth-submit").textContent = signup ? "Create account" : "Log in";
  $("auth-switch-text").textContent = signup ? "Already have an account?" : "No account yet?";
  $("auth-switch").textContent = signup ? "Log in" : "Create one";
  $("auth-password").autocomplete = signup ? "new-password" : "current-password";
  showMessage("auth-message", "");
}

$("auth-switch").addEventListener("click", () =>
  setAuthMode(authMode === "login" ? "signup" : "login")
);

$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;

  if (authMode === "signup") {
    // REGISTER a new user
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) return showMessage("auth-message", error.message, true);
    if (!data.session) {
      showMessage("auth-message", "Account created. Check your email to confirm, then log in.");
      setAuthMode("login");
    }
  } else {
    // LOG IN an existing user
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) return showMessage("auth-message", error.message, true);
  }
});

// LOG OUT
$("logout-btn").addEventListener("click", async () => {
  await db.auth.signOut();
});

// Runs on page load and whenever the user logs in or out
db.auth.onAuthStateChange((_event, session) => {
  if (session) {
    authView.hidden = true;
    appView.hidden = false;
    userBar.hidden = false;
    $("user-email").textContent = session.user.email;
    loadMovies();
  } else {
    authView.hidden = false;
    appView.hidden = true;
    userBar.hidden = true;
    movies = [];
    $("auth-form").reset();
  }
});

// ============================================================
// DATABASE CRUD (Create, Read, Update, Delete)
// ============================================================

// READ: get all of this user's movies
async function loadMovies() {
  const { data, error } = await db
    .from("movies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return showMessage("app-message", error.message, true);
  movies = data;
  render();
}

// CREATE: add a new movie
$("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("add-title").value.trim();
  if (!title) return;
  const { error } = await db.from("movies").insert({
    title,
    year: $("add-year").value ? Number($("add-year").value) : null,
    genre: $("add-genre").value.trim() || null,
  });
  if (error) return showMessage("app-message", error.message, true);
  $("add-form").reset();
  showMessage("app-message", `Added “${title}”.`);
  loadMovies();
});

// UPDATE: change fields on one movie
async function updateMovie(id, changes) {
  const { error } = await db.from("movies").update(changes).eq("id", id);
  if (error) return showMessage("app-message", error.message, true);
  loadMovies();
}

// DELETE: remove one movie
async function deleteMovie(movie) {
  if (!confirm(`Delete “${movie.title}” from your list?`)) return;
  const { error } = await db.from("movies").delete().eq("id", movie.id);
  if (error) return showMessage("app-message", error.message, true);
  showMessage("app-message", `Deleted “${movie.title}”.`);
  loadMovies();
}

// ============================================================
// RENDERING THE LIST
// ============================================================

document.querySelectorAll(".filter").forEach((btn) =>
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    document.querySelectorAll(".filter").forEach((b) => b.classList.toggle("active", b === btn));
    render();
  })
);

function render() {
  const list = $("movie-list");
  list.innerHTML = "";

  const shown = movies.filter((m) =>
    filter === "all" ? true : filter === "watched" ? m.watched : !m.watched
  );

  const watchedCount = movies.filter((m) => m.watched).length;
  $("count").textContent = `${watchedCount} of ${movies.length} watched`;
  $("empty").hidden = shown.length > 0;

  shown.forEach((m) => list.appendChild(m.id === editingId ? editRow(m) : movieRow(m)));
}

// A normal movie "ticket"
function movieRow(m) {
  const li = el("li", { className: "ticket" + (m.watched ? " watched" : "") });

  const info = el("div");
  info.append(
    el("p", { className: "title", textContent: m.title }),
    el("p", { className: "meta", textContent: [m.year, m.genre].filter(Boolean).join(", ") || "No details" })
  );

  const stub = el("div", { className: "stub" });

  const watchedBtn = el("button", {
    className: "small",
    textContent: m.watched ? "Mark unwatched" : "Mark watched",
    onclick: () => updateMovie(m.id, { watched: !m.watched }),
  });

  const rating = el("select", { ariaLabel: `Rating for ${m.title}` });
  rating.append(el("option", { value: "", textContent: "Rate" }));
  for (let i = 1; i <= 5; i++) {
    rating.append(el("option", { value: i, textContent: "★".repeat(i) }));
  }
  rating.value = m.rating ?? "";
  rating.onchange = () => updateMovie(m.id, { rating: rating.value ? Number(rating.value) : null });

  const editBtn = el("button", {
    className: "small",
    textContent: "Edit",
    onclick: () => { editingId = m.id; render(); },
  });

  const delBtn = el("button", {
    className: "small delete",
    textContent: "Delete",
    onclick: () => deleteMovie(m),
  });

  stub.append(watchedBtn, rating, editBtn, delBtn);
  li.append(info, stub);
  return li;
}

// A movie row in edit mode
function editRow(m) {
  const li = el("li", { className: "ticket" });
  const fields = el("div", { className: "edit-fields" });
  const title = el("input", { value: m.title, ariaLabel: "Title" });
  const year = el("input", { type: "number", value: m.year ?? "", ariaLabel: "Year" });
  const genre = el("input", { value: m.genre ?? "", ariaLabel: "Genre" });
  fields.append(title, year, genre);

  const stub = el("div", { className: "stub" });
  stub.append(
    el("button", {
      className: "small primary",
      textContent: "Save changes",
      onclick: () => {
        if (!title.value.trim()) return;
        editingId = null;
        updateMovie(m.id, {
          title: title.value.trim(),
          year: year.value ? Number(year.value) : null,
          genre: genre.value.trim() || null,
        });
      },
    }),
    el("button", {
      className: "small",
      textContent: "Cancel",
      onclick: () => { editingId = null; render(); },
    })
  );

  li.append(fields, stub);
  setTimeout(() => title.focus(), 0);
  return li;
}

// ---------- Helpers ----------
function el(tag, props = {}) {
  return Object.assign(document.createElement(tag), props);
}

function showMessage(id, text, isError = false) {
  const box = $(id);
  box.textContent = text;
  box.classList.toggle("error", isError);
}

setAuthMode("login");
