/* ==========================
   Review Web App (Frontend)
   - localStorage persistence
   - add / delete / clear all
   - filter, sort, search
========================== */

const STORAGE_KEY = "reviews_v1";

const form = document.getElementById("reviewForm");
const nameEl = document.getElementById("name");
const titleEl = document.getElementById("title");
const msgEl = document.getElementById("message");
const countEl = document.getElementById("count");

const ratingEl = document.getElementById("rating");
const ratingHint = document.getElementById("ratingHint");
const starPicker = document.getElementById("starPicker");

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const summaryEl = document.getElementById("summary");

const searchEl = document.getElementById("search");
const filterEl = document.getElementById("filter");
const sortEl = document.getElementById("sort");

const clearAllBtn = document.getElementById("clearAllBtn");

const avgNum = document.getElementById("avgNum");
const avgStars = document.getElementById("avgStars");

let reviews = loadReviews();
let currentRating = 0;

// ---------- Helpers ----------
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function toStars(n) {
  const full = "★".repeat(n);
  const empty = "☆".repeat(5 - n);
  return full + empty;
}

function saveReviews() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

function loadReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ---------- Star Picker ----------
function renderStarPicker() {
  starPicker.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "star" + (i <= currentRating ? " active" : "");
    btn.setAttribute("aria-label", `${i} star`);
    btn.textContent = "★";
    btn.addEventListener("click", () => setRating(i));
    starPicker.appendChild(btn);
  }
  ratingEl.value = String(currentRating);
  ratingHint.textContent = currentRating ? `Selected: ${currentRating}/5` : "Select a rating";
}

function setRating(n) {
  currentRating = n;
  renderStarPicker();
}

// ---------- Render Reviews ----------
function getVisibleReviews() {
  const q = searchEl.value.trim().toLowerCase();
  const filter = filterEl.value; // "all" or "1..5"
  const sort = sortEl.value;

  let data = [...reviews];

  // filter
  if (filter !== "all") {
    const f = Number(filter);
    data = data.filter(r => r.rating === f);
  }

  // search
  if (q) {
    data = data.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.message.toLowerCase().includes(q)
    );
  }

  // sort
  if (sort === "newest") data.sort((a, b) => b.createdAt - a.createdAt);
  if (sort === "oldest") data.sort((a, b) => a.createdAt - b.createdAt);
  if (sort === "highest") data.sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt);
  if (sort === "lowest") data.sort((a, b) => a.rating - b.rating || b.createdAt - a.createdAt);

  return data;
}

function updateSummary() {
  const total = reviews.length;
  summaryEl.textContent = `${total} review${total === 1 ? "" : "s"}`;

  if (!total) {
    avgNum.textContent = "0.0";
    avgStars.textContent = "★★★★★";
    return;
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / total;
  avgNum.textContent = avg.toFixed(1);

  const rounded = Math.round(avg);
  avgStars.textContent = toStars(rounded).replace(/☆/g, "★"); // keep it visually consistent
}

function render() {
  updateSummary();

  const data = getVisibleReviews();
  listEl.innerHTML = "";

  if (data.length === 0) {
    emptyEl.classList.remove("hidden");
  } else {
    emptyEl.classList.add("hidden");
  }

  data.forEach(r => {
    const card = document.createElement("div");
    card.className = "review";
    card.innerHTML = `
      <div class="reviewTop">
        <div>
          <div class="badge">
            <span class="pill">${escapeHtml(r.name)}</span>
            <span class="pill">${toStars(r.rating)}</span>
            <span class="pill">${escapeHtml(formatDate(r.createdAt))}</span>
          </div>
          <div class="title">${escapeHtml(r.title)}</div>
        </div>
        <div class="actions">
          <button class="iconBtn" data-del="${r.id}" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="msg">${escapeHtml(r.message)}</div>
    `;
    listEl.appendChild(card);
  });

  // delete handlers
  listEl.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      reviews = reviews.filter(r => r.id !== id);
      saveReviews();
      render();
    });
  });
}

// ---------- Events ----------
msgEl.addEventListener("input", () => {
  countEl.textContent = String(msgEl.value.length);
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = nameEl.value.trim();
  const title = titleEl.value.trim();
  const message = msgEl.value.trim();
  const rating = Number(ratingEl.value);

  if (!rating || rating < 1 || rating > 5) {
    ratingHint.textContent = "⚠️ Please select a rating (1–5)";
    ratingHint.style.color = "#ffb4bf";
    return;
  } else {
    ratingHint.style.color = "";
  }

  const review = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name,
    title,
    message,
    rating,
    createdAt: Date.now()
  };

  reviews.unshift(review);
  saveReviews();

  // reset
  form.reset();
  msgEl.value = "";
  countEl.textContent = "0";
  currentRating = 0;
  renderStarPicker();

  render();
});

searchEl.addEventListener("input", render);
filterEl.addEventListener("change", render);
sortEl.addEventListener("change", render);

clearAllBtn.addEventListener("click", () => {
  if (!reviews.length) return;
  const ok = confirm("Clear all reviews? This cannot be undone.");
  if (!ok) return;
  reviews = [];
  saveReviews();
  render();
});

// ---------- Init ----------
renderStarPicker();
render();
