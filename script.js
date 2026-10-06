const ORDER_URL = "https://www.calaboni.dk/order.php?token=www.calaboni.dk";
const IMG_CDN = "https://cdn.nemtakeaway.dk/site/upload/images/l/";
// Alle dage 11:00–21:00 (0 = søndag)
const HOURS = { open: 11, close: 21 };
const DAYS = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- Navigation ---------- */
const nav = $("#nav");
const burger = $("#burger");
const navLinks = $("#navLinks");

burger.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
$$("a", navLinks).forEach((a) => a.addEventListener("click", () => {
  navLinks.classList.remove("open");
  burger.setAttribute("aria-expanded", false);
}));

const mobileOrder = $(".mobile-order");
window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 10);
  mobileOrder.classList.toggle("show", window.scrollY > window.innerHeight * 0.7);
}, { passive: true });

// Fremhæv aktivt menupunkt
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    $$(".nav-links a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
  });
}, { rootMargin: "-45% 0px -50% 0px" });
["om-os", "menu", "galleri", "kontakt"].forEach((id) => sectionObserver.observe(document.getElementById(id)));

/* ---------- Åbent / lukket ---------- */
function updateStatus() {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  const pill = $("#statusPill");
  const text = $("#statusText");
  pill.classList.remove("open", "closed");
  if (h >= HOURS.open && h < HOURS.close) {
    pill.classList.add("open");
    text.textContent = `Åbent nu · lukker kl. ${HOURS.close}:00`;
  } else {
    pill.classList.add("closed");
    text.textContent = h < HOURS.open ? `Lukket · åbner i dag kl. ${HOURS.open}:00` : `Lukket · åbner i morgen kl. ${HOURS.open}:00`;
  }
}

function renderHours() {
  const today = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  $("#hours").innerHTML = order.map((d) => `
    <li class="${d === today ? "today" : ""}">
      <span>${DAYS[d]}${d === today ? " (i dag)" : ""}</span>
      <span>${HOURS.open}:00 – ${HOURS.close}:00</span>
    </li>`).join("");
}

/* ---------- Menu ---------- */
const menuList = $("#menuList");
const catTabs = $("#catTabs");
const searchInput = $("#menuSearch");
const vegOnly = $("#vegOnly");

function dishHtml([num, name, desc, price, img, opts = {}], icon) {
  const media = img
    ? `<img class="dish-img" src="${IMG_CDN}${img}.jpg" alt="${escapeHtml(name)}" loading="lazy" onerror="this.outerHTML='<div class=&quot;dish-emoji&quot;>${icon}</div>'">`
    : `<div class="dish-emoji">${icon}</div>`;
  return `
    <article class="dish">
      ${media}
      <div class="dish-body">
        <div class="dish-top">
          <h4>${num ? `<span class="num">${num}.</span>` : ""}${escapeHtml(name)}${opts.veg ? '<span class="veg">VEG</span>' : ""}</h4>
          <span class="price">${opts.from ? "<small>fra</small>" : ""}${price} kr.</span>
        </div>
        ${desc ? `<p>${escapeHtml(desc)}</p>` : ""}
        <a class="dish-order" href="${ORDER_URL}">Bestil →</a>
      </div>
    </article>`;
}

function renderMenu() {
  const q = searchInput.value.trim().toLowerCase();
  const veg = vegOnly.checked;
  let total = 0;

  menuList.innerHTML = MENU.map((cat) => {
    const items = cat.items.filter(([num, name, desc, , , opts = {}]) => {
      if (veg && !opts.veg) return false;
      if (!q) return true;
      return `${num} ${name} ${desc} ${cat.cat}`.toLowerCase().includes(q);
    });
    total += items.length;
    if (!items.length) return "";
    return `
      <section class="menu-cat" id="cat-${slug(cat.cat)}" data-cat="${escapeHtml(cat.cat)}">
        <div class="menu-cat-head"><h3>${cat.icon} ${escapeHtml(cat.cat)}</h3><span class="count">${items.length} ${items.length === 1 ? "ret" : "retter"}</span></div>
        <div class="menu-grid">${items.map((it) => dishHtml(it, cat.icon)).join("")}</div>
      </section>`;
  }).join("");

  $("#menuEmpty").hidden = total > 0;
  renderTabs();
  observeCats();
}

function renderTabs() {
  const visible = $$(".menu-cat").map((s) => s.dataset.cat);
  catTabs.innerHTML = MENU.filter((c) => visible.includes(c.cat))
    .map((c) => `<button class="cat-tab" data-target="cat-${slug(c.cat)}">${c.icon} ${escapeHtml(c.cat)}</button>`)
    .join("");
}

catTabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".cat-tab");
  if (!btn) return;
  scrollToCat(btn.dataset.target);
});

function scrollToCat(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = nav.offsetHeight + $("#catTabsWrap").offsetHeight + 12;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
}

let catObserver;
function observeCats() {
  catObserver?.disconnect();
  catObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      $$(".cat-tab").forEach((t) => {
        const active = t.dataset.target === e.target.id;
        t.classList.toggle("active", active);
        if (active) catTabs.scrollTo({ left: t.offsetLeft - catTabs.offsetWidth / 2 + t.offsetWidth / 2, behavior: "smooth" });
      });
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  $$(".menu-cat").forEach((s) => catObserver.observe(s));
}

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderMenu, 150);
});
vegOnly.addEventListener("change", renderMenu);

// Favorit-kort hopper direkte til en kategori
$$("[data-jump]").forEach((a) => a.addEventListener("click", (e) => {
  e.preventDefault();
  searchInput.value = "";
  vegOnly.checked = false;
  renderMenu();
  scrollToCat("cat-" + slug(a.dataset.jump));
}));

/* ---------- Animationer ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
$$(".reveal").forEach((el) => revealObserver.observe(el));

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = +el.dataset.count;
    const start = performance.now();
    const step = (t) => {
      const p = Math.min((t - start) / 1200, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    countObserver.unobserve(el);
  });
}, { threshold: 0.6 });
$$("[data-count]").forEach((el) => countObserver.observe(el));

/* ---------- Init ---------- */
$("#year").textContent = new Date().getFullYear();
updateStatus();
setInterval(updateStatus, 60_000);
renderHours();
renderMenu();
