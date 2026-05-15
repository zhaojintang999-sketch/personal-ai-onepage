/* 轻量交互：滚动渐入、导航高亮、数字计数、进度条、粒子背景（克制） */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// --- year ---
(() => {
  const y = $("#year");
  if (y) y.textContent = String(new Date().getFullYear());
})();

// --- reveal on scroll ---
(() => {
  const els = $$(".reveal");
  if (!els.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );

  els.forEach((el) => io.observe(el));
})();

// --- smooth nav (better than pure CSS on some browsers) ---
(() => {
  const links = $$(".nav__link");
  links.forEach((a) => {
    a.addEventListener("click", (ev) => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const target = document.querySelector(href);
      if (!target) return;
      ev.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", href);
    });
  });
})();

// --- scroll spy ---
(() => {
  const links = $$(".nav__link");
  const map = new Map(links.map((a) => [a.getAttribute("href"), a]));
  const sections = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if (!sections.length) return;

  const setActive = (id) => {
    links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === id));
  };

  const io = new IntersectionObserver(
    (entries) => {
      // pick the most visible intersecting section
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = `#${visible.target.id}`;
      if (map.has(id)) setActive(id);
    },
    { threshold: [0.25, 0.35, 0.45, 0.55], rootMargin: "-15% 0px -70% 0px" },
  );

  sections.forEach((s) => io.observe(s));
})();

// --- number count-up ---
function animateNumber(el, to, { duration = 900, decimals = 0 } = {}) {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    el.textContent = formatNumber(to, decimals);
    return;
  }

  const from = 0;
  const start = performance.now();
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const v = from + (to - from) * easeOut(t);
    el.textContent = formatNumber(v, decimals);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function formatNumber(n, decimals = 0) {
  const fixed = Number(n).toFixed(decimals);
  const [i, d] = fixed.split(".");
  const withComma = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return d ? `${withComma}.${d}` : withComma;
}

(() => {
  const els = $$(".count");
  if (!els.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        if (el.dataset.done === "1") continue;
        el.dataset.done = "1";

        const raw = Number(el.dataset.count ?? "0");
        const suffix = el.dataset.suffix ?? "";
        const decimals = Number.isInteger(raw) ? 0 : 2;

        // animate the number into a temp span, then append suffix
        const holder = document.createElement("span");
        holder.textContent = "0";
        el.replaceChildren(holder);
        animateNumber(holder, raw, { duration: 950, decimals });

        // keep suffix stable
        if (suffix) {
          const suf = document.createElement("span");
          suf.textContent = suffix;
          suf.style.opacity = "0.85";
          suf.style.marginLeft = "1px";
          el.appendChild(suf);
        }

        io.unobserve(el);
      }
    },
    { threshold: 0.6 },
  );

  els.forEach((el) => io.observe(el));
})();

// --- progress bars ---
(() => {
  const bars = $$(".progress__bar");
  if (!bars.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const bar = e.target;
        const fill = bar.querySelector(".progress__fill");
        if (!fill) continue;
        const pct = Number(bar.dataset.progress ?? "0");
        fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        io.unobserve(bar);
      }
    },
    { threshold: 0.5 },
  );

  bars.forEach((b) => io.observe(b));
})();

// --- accordion ---
(() => {
  const root = document.querySelector("[data-accordion]");
  if (!root) return;

  const items = $$(".accordion__item", root);
  items.forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = btn.nextElementSibling;
      if (!panel || !panel.classList.contains("accordion__panel")) return;
      const open = btn.getAttribute("aria-expanded") === "true";

      // close others for clarity
      items.forEach((b) => {
        const p = b.nextElementSibling;
        b.setAttribute("aria-expanded", "false");
        if (p && p.classList) p.classList.remove("is-open");
      });

      // toggle current
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      panel.classList.toggle("is-open", !open);
    });
  });
})();

// --- progress card detail (click-to-expand) ---
(() => {
  const card = document.querySelector("[data-progress-card]");
  if (!card) return;
  const detail = card.querySelector("[data-progress-detail]");
  const close = card.querySelector("[data-progress-close]");
  if (!detail) return;

  const open = () => {
    detail.classList.add("is-open");
    detail.setAttribute("aria-hidden", "false");
  };
  const closeIt = () => {
    detail.classList.remove("is-open");
    detail.setAttribute("aria-hidden", "true");
  };
  const toggle = () => {
    if (detail.classList.contains("is-open")) closeIt();
    else open();
  };

  card.addEventListener("click", (e) => {
    const target = e.target;
    // ignore clicks on buttons/links inside (e.g., close button)
    if (target && (target.closest("button") || target.closest("a"))) {
      // if it's the close button, close
      if (target.closest("[data-progress-close]")) closeIt();
      return;
    }
    toggle();
  });

  close?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeIt();
  });
})();

// --- lightbox for images ---
(() => {
  const dialog = $("#lightbox");
  if (!dialog) return;
  const img = $(".lightbox__img", dialog);
  const cap = $(".lightbox__cap", dialog);
  const closeBtn = $(".lightbox__close", dialog);

  function openLightbox(src, caption) {
    if (img) img.src = src;
    if (img) img.alt = caption || "图片预览";
    if (cap) cap.textContent = caption || "";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "true");
  }

  function closeLightbox() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  closeBtn?.addEventListener("click", closeLightbox);
  dialog.addEventListener("click", (e) => {
    // click backdrop to close
    const rect = dialog.getBoundingClientRect();
    const inDialog =
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inDialog) closeLightbox();
  });

  // bind triggers
  $$("[data-lightbox]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const src = btn.getAttribute("data-src");
      const caption = btn.getAttribute("data-caption") || "";
      if (!src) return;
      openLightbox(src, caption);
    });
  });
})();

// --- subtle particles (very low saturation / low opacity) ---
(() => {
  const canvas = $("#particles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  let w = 0;
  let h = 0;
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  let particles = [];
  let raf = 0;
  let mouse = { x: 0, y: 0, has: false };

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(26, Math.min(52, Math.floor(w / 34)));
    particles = new Array(count).fill(0).map(() => spawn(true));
  }

  function spawn(initial = false) {
    const r = rand(1.2, 2.2);
    return {
      x: initial ? rand(0, w) : rand(-20, w + 20),
      y: rand(0, h),
      vx: rand(-0.12, 0.12),
      vy: rand(-0.08, 0.08),
      r,
      a: rand(0.18, 0.42), // alpha
      t: rand(0, Math.PI * 2),
    };
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function step() {
    ctx.clearRect(0, 0, w, h);

    // faint wash to soften
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, 0, w, h);

    const linkDist = Math.min(160, Math.max(120, w * 0.12));

    // particles
    for (const p of particles) {
      p.t += 0.008;
      const drift = 0.12;
      p.x += p.vx + Math.cos(p.t) * 0.02;
      p.y += p.vy + Math.sin(p.t) * 0.02;

      // subtle mouse parallax
      if (mouse.has) {
        const dx = (mouse.x - w * 0.5) * 0.00002;
        const dy = (mouse.y - h * 0.5) * 0.00002;
        p.x += dx * drift * 30;
        p.y += dy * drift * 30;
      }

      if (p.x < -40 || p.x > w + 40) p.x = rand(0, w);
      if (p.y < -40 || p.y > h + 40) p.y = rand(0, h);

      // dot
      ctx.beginPath();
      ctx.fillStyle = `rgba(123, 212, 255, ${p.a * 0.55})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // links
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > linkDist) continue;
        const alpha = (1 - dist / linkDist) * 0.085;
        ctx.strokeStyle = `rgba(123, 212, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    raf = requestAnimationFrame(step);
  }

  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    resize();
    raf = requestAnimationFrame(step);
  });

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.has = true;
  });
  window.addEventListener("mouseleave", () => (mouse.has = false));

  resize();
  raf = requestAnimationFrame(step);
})();
