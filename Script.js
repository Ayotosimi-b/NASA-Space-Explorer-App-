// ---- NASA API key ----
// DEMO_KEY works out of the box but is rate-limited (30 req/hour, 50/day
// shared by everyone using it). Get your own free key in seconds at
// https://api.nasa.gov and paste it in below.
const API_KEY = "DEMO_KEY";

// ---- DOM references ----
const startInput = document.getElementById("startDate");
const endInput = document.getElementById("endDate");
const fetchBtn = document.getElementById("fetchBtn");
const gallery = document.getElementById("gallery");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const factBanner = document.getElementById("factBanner");

const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const modalMedia = document.getElementById("modalMedia");
const modalTitle = document.getElementById("modalTitle");
const modalDate = document.getElementById("modalDate");
const modalExplanation = document.getElementById("modalExplanation");

// ---- "Did You Know?" space facts (LevelUp) ----
const spaceFacts = [
  "A day on Venus is longer than its year — it takes 243 Earth days to rotate once, but only 225 to orbit the Sun.",
  "Neutron stars are so dense that a single teaspoon of their material would weigh about a billion tons.",
  "The footprints left on the Moon by Apollo astronauts will likely stay there for millions of years — there's no wind or water to erode them.",
  "One million Earths could fit inside the Sun.",
  "Saturn could float in water — it's the only planet in the solar system less dense than water.",
  "Space is completely silent because sound waves need a medium (like air) to travel, and space is a near-total vacuum.",
  "The Great Red Spot on Jupiter is a storm that has been raging for at least 350 years.",
  "There are more trees on Earth than stars in the Milky Way — but more stars in the observable universe than grains of sand on every beach on Earth.",
  "A year on Mercury is just 88 Earth days, but a single day (sunrise to sunrise) lasts about 176 Earth days.",
  "The International Space Station orbits Earth roughly every 90 minutes, meaning astronauts see about 16 sunrises and sunsets a day."
];

function showRandomFact() {
  const fact = spaceFacts[Math.floor(Math.random() * spaceFacts.length)];
  factBanner.textContent = `Did you know? ${fact}`;
}

// ---- Date helpers ----
function toISODate(date) {
  return date.toISOString().split("T")[0];
}

function setDefaultDateRange() {
  const today = new Date();
  const nineDaysAgo = new Date();
  nineDaysAgo.setDate(today.getDate() - 8); // 8 days back + today = 9 days

  startInput.value = toISODate(nineDaysAgo);
  endInput.value = toISODate(today);
  startInput.max = toISODate(today);
  endInput.max = toISODate(today);
}

// ---- Fetching APOD data ----
async function fetchApod(startDate, endDate) {
  const url = `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}&thumbs=true`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.msg || `NASA API error (status ${response.status})`);
  }

  const data = await response.json();
  // The API can return a single object instead of an array if start and
  // end date are the same day — normalize to an array either way.
  return Array.isArray(data) ? data : [data];
}

// ---- Rendering the gallery ----
function renderGallery(items) {
  gallery.innerHTML = "";

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "gallery-item";

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "thumb-wrap";

    const img = document.createElement("img");
    img.alt = item.title;
    img.loading = "lazy";

    if (item.media_type === "video") {
      img.src = item.thumbnail_url || "";
      const playBadge = document.createElement("span");
      playBadge.className = "play-badge";
      playBadge.textContent = "▶";
      thumbWrap.appendChild(img);
      thumbWrap.appendChild(playBadge);
    } else {
      img.src = item.url;
      thumbWrap.appendChild(img);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h3");
    title.textContent = item.title;

    const date = document.createElement("p");
    date.className = "item-date";
    date.textContent = formatDisplayDate(item.date);

    body.appendChild(title);
    body.appendChild(date);

    card.appendChild(thumbWrap);
    card.appendChild(body);

    card.addEventListener("click", () => openModal(item));

    gallery.appendChild(card);
  });
}

function formatDisplayDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

// ---- Modal (LevelUp: handles video entries too) ----
function openModal(item) {
  modalMedia.innerHTML = "";

  if (item.media_type === "video") {
    if (item.url && item.url.includes("youtube")) {
      const iframe = document.createElement("iframe");
      iframe.src = item.url;
      iframe.setAttribute("allowfullscreen", "");
      iframe.title = item.title;
      modalMedia.appendChild(iframe);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "video-fallback";
      fallback.innerHTML = `This entry is a video that can't be embedded here. <a href="${item.url}" target="_blank" rel="noopener noreferrer">Watch it on the original site &rarr;</a>`;
      modalMedia.appendChild(fallback);
    }
  } else {
    const img = document.createElement("img");
    img.src = item.hdurl || item.url;
    img.alt = item.title;
    modalMedia.appendChild(img);
  }

  modalTitle.textContent = item.title;
  modalDate.textContent = formatDisplayDate(item.date);
  modalExplanation.textContent = item.explanation;

  modalOverlay.classList.remove("hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  modalMedia.innerHTML = "";
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ---- Main fetch-and-render flow ----
async function handleFetchClick() {
  const startDate = startInput.value;
  const endDate = endInput.value;

  errorMessage.classList.add("hidden");

  if (!startDate || !endDate) {
    errorMessage.textContent = "Please choose both a start and end date.";
    errorMessage.classList.remove("hidden");
    return;
  }

  if (startDate > endDate) {
    errorMessage.textContent = "Start date must be before the end date.";
    errorMessage.classList.remove("hidden");
    return;
  }

  gallery.innerHTML = "";
  loadingMessage.classList.remove("hidden");
  fetchBtn.disabled = true;

  try {
    const items = await fetchApod(startDate, endDate);
    renderGallery(items);
  } catch (err) {
    errorMessage.textContent = `Couldn't load space photos: ${err.message}`;
    errorMessage.classList.remove("hidden");
  } finally {
    loadingMessage.classList.add("hidden");
    fetchBtn.disabled = false;
  }
}

fetchBtn.addEventListener("click", handleFetchClick);

// ---- Initialize ----
setDefaultDateRange();
showRandomFact();
handleFetchClick(); // load the default 9-day range right away
