const projects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];

const masonryGrid = document.getElementById("masonryGrid");
const filtersWrap = document.getElementById("filters");

// ---------- Helpers ----------
function uniq(arr) {
  return [...new Set(arr)];
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function projectMedia(p) {
  if (p.mediaType === "video" && p.mediaSrc) {
    return `
      <video class="h-full w-full object-cover" muted playsinline loop preload="metadata">
        <source src="${escapeHtml(p.mediaSrc)}" type="video/mp4" />
      </video>
    `;
  }

  if (p.mediaType === "image" && p.mediaSrc) {
    return `
      <img class="h-full w-full object-cover" src="${escapeHtml(p.mediaSrc)}" alt="${escapeHtml(p.title)}" loading="lazy" />
    `;
  }

  return `
    <div class="h-full w-full bg-gradient-to-br from-white/10 via-white/5 to-transparent"></div>
  `;
}

function cardTemplateMasonry(p, idx) {
  const title = escapeHtml(p.title || "Untitled Project");
  const desc = (p.description || "").trim();
  const tags = Array.isArray(p.tags) ? p.tags : [];

  // Calculate aspect ratio hint if possible, or default to auto height
  // Since we are using flex/grid inside columns, the height will be determined by content.
  // Tailwind columns handle the masonry layout automatically.

  return `
  <article 
    class="break-inside-avoid mb-6 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:bg-white/[0.06] transition duration-300 group"
  >
    <!-- Media Container -->
    <div class="relative w-full overflow-hidden">
      ${projectMedia(p)}
      
      <!-- Overlay on Hover -->
      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center pointer-events-none">
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <div class="flex items-start justify-between gap-3 mb-2">
        <h3 class="text-base font-semibold text-zinc-100 leading-tight">${title}</h3>
      </div>
      
      ${desc ? `<p class="text-sm text-zinc-400 line-clamp-3 mb-3">${escapeHtml(desc)}</p>` : ""}

      <div class="flex flex-wrap gap-1.5 mt-auto">
        ${tags
          .map(
            (t) =>
              `<span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-zinc-400">${escapeHtml(t)}</span>`,
          )
          .join("")}
      </div>
    </div>
  </article>
  `;
}

// ---------- Render ----------
let activeTag = "All";

function renderFilters() {
  const allTags = uniq(
    projects.flatMap((p) => (Array.isArray(p.tags) ? p.tags : [])),
  );

  const tags = ["All", ...allTags];

  filtersWrap.innerHTML = tags
    .map((t) => {
      const isActive = t === activeTag;
      return `
        <button
          class="rounded-full px-4 py-2 text-sm border transition
                 ${isActive ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/10"}"
          data-tag="${escapeHtml(t)}"
          type="button"
        >
          ${escapeHtml(t)}
        </button>
      `;
    })
    .join("");

  filtersWrap.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTag = btn.dataset.tag || "All";
      renderMasonry();
      renderFilters();
    });
  });
}

function renderMasonry() {
  const filtered =
    activeTag === "All"
      ? projects
      : projects.filter((p) => (p.tags || []).includes(activeTag));

  if (!masonryGrid) return;

  masonryGrid.innerHTML = filtered.map(cardTemplateMasonry).join("");

  // Re-init video autoplay for new elements
  autoPlayVideosInView();

  // Cinematic Revelation
  initMasonryAnimations();
}

// ---------- Cinematic Masonry Reveal ----------
function initMasonryAnimations() {
  const cards = gsap.utils.toArray("#masonryGrid article");
  if (cards.length === 0) return;

  // Clear existing ScrollTriggers to prevent leaks on re-render
  ScrollTrigger.getAll().forEach((st) => {
    if (st.trigger && st.trigger.closest("#masonryGrid")) {
      st.kill();
    }
  });

  gsap.fromTo(
    cards,
    {
      opacity: 0,
      y: 50,
      filter: "blur(10px) grayscale(0.5)",
      scale: 0.95,
    },
    {
      opacity: 1,
      y: 0,
      filter: "blur(0px) grayscale(0)",
      scale: 1,
      duration: 1.2,
      stagger: 0.1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: "#masonryGrid",
        start: "top 85%",
        toggleActions: "play none none none",
      },
    },
  );
}

// ---------- Auto-play videos when visible ----------
function autoPlayVideosInView() {
  const videos = document.querySelectorAll("video");

  if (videos.length === 0) return;

  const vObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(async (entry) => {
        const v = entry.target;
        if (entry.isIntersecting) {
          try {
            await v.play();
          } catch {}
        } else {
          v.pause();
        }
      });
    },
    { threshold: 0.25 }, // Lower threshold for better mobile experience
  );

  videos.forEach((v) => vObserver.observe(v));
}

// ---------- Hero Scroll 3D Gallery (GSAP Version) ----------

// ---------- 3D Rotating Carousel Hero ----------

function initHeroCarousel() {
  const ring = document.getElementById("carouselRing");
  const heroSection = document.getElementById("heroCarousel");
  const overlay = document.getElementById("projectOverlay");
  const closeBtn = document.getElementById("closeOverlay");

  if (!ring || !heroSection) return;

  // New Landscape Indices (17-24 -> Indices 16-23)
  const heroIndices = [16, 17, 18, 19, 20, 21, 22, 23];
  const items = heroIndices.map((i) => projects[i]).filter(Boolean);
  const count = items.length; // 8
  const angleStep = 360 / count;

  let cardWidth, cardHeight, radius;

  function calculateDimensions() {
    const w = window.innerWidth;
    if (w < 480) {
      // Small Mobile
      cardWidth = 180;
      cardHeight = 160;
    } else if (w < 768) {
      // Large Mobile / Small Tablet
      cardWidth = 240;
      cardHeight = 210;
    } else if (w < 1280) {
      // Desktop / Tablet Landscape (75% of 340x300)
      cardWidth = 255;
      cardHeight = 225;
    } else {
      // Large Desktop (75% of 400x350)
      cardWidth = 300;
      cardHeight = 262;
    }

    const theta = Math.PI / count;
    radius = Math.round((cardWidth / (2 * Math.tan(theta))) * 1.05);
  }

  function renderCarousel() {
    calculateDimensions();
    ring.innerHTML = items
      .map((p, i) => {
        const angle = i * angleStep;
        return `
        <div 
          class="carousel-item absolute top-0 left-0 cursor-pointer group will-change-transform"
          style="
            width: ${cardWidth}px;
            height: ${cardHeight}px;
            transform: rotateY(${angle}deg) translateZ(${radius}px);
            backface-visibility: visible;
            left: 50%;
            top: 50%;
            margin-left: -${cardWidth / 2}px; 
            margin-top: -${cardHeight / 2}px; 
          "
          data-index="${i}"
        >
          <div class="w-full h-full flex flex-col rounded-xl overflow-hidden border border-white/5 bg-[#0a0a0a] shadow-[0_0_15px_rgba(0,0,0,1)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_40px_rgba(0,100,255,0.2)]">
              <div class="w-full h-[70%] overflow-hidden relative">
                <img src="${escapeHtml(p.mediaSrc)}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="${escapeHtml(p.title)}" loading="eager" draggable="false" />
                <div class="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
              <div class="w-full h-[30%] px-4 py-3 flex flex-col justify-between bg-[#111] border-t border-white/5">
                  <div>
                    <h3 class="text-white font-serif-display text-base md:text-lg leading-none mb-2 truncate">${escapeHtml(p.title)}</h3>
                    <p class="text-zinc-500 text-[10px] md:text-xs line-clamp-2 leading-relaxed opacity-70">${escapeHtml(p.description || "Digital artwork showcase.")}</p>
                  </div>
              </div>
          </div>
        </div>
      `;
      })
      .join("");

    bindCarouselListeners();
  }

  // --- INTERACTIVE LOGIC (Delayed Hover + Conditional Click) ---
  let hoverTimer = null;
  let activeCard = null;

  function resetActiveState() {
    if (!activeCard) return;
    activeCard.dataset.ready = "false";
    activeCard.style.cursor = "default";
    gsap.to(activeCard, {
      y: 0,
      scale: 1,
      zIndex: 1,
      boxShadow: "0 0 15px rgba(0,0,0,1)",
      duration: 0.5,
      ease: "power2.out",
    });
    activeCard = null;
  }

  function bindCarouselListeners() {
    const cards = ring.querySelectorAll(".carousel-item");
    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    cards.forEach((card, index) => {
      // Initialize state
      card.dataset.ready = "false";

      // Mouse Enter: Start Timer (Only useful for non-touch/desktop)
      card.addEventListener("mouseenter", () => {
        if (isDragging || isTouch) return; // Don't activate during drag or on touch

        // --- MAGNETIC SPOTLIGHT TRIGGER ---
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        if (window.setSpotlightMagnetic)
          window.setSpotlightMagnetic(true, centerX, centerY);

        // Clear any existing timer
        if (hoverTimer) clearTimeout(hoverTimer);

        hoverTimer = setTimeout(() => {
          activeCard = card;
          card.dataset.ready = "true";
          card.style.cursor = "pointer";

          // Lift Animation (small distance up)
          gsap.to(card, {
            y: -30,
            scale: 1.12,
            zIndex: 100,
            boxShadow: "0 25px 60px rgba(0,100,255,0.5)",
            duration: 0.5,
            ease: "power2.out",
          });
        }, 300); // 0.3 second delay
      });

      // Mouse Leave: Cancel & Reset
      card.addEventListener("mouseleave", () => {
        if (isTouch) return;
        if (window.setSpotlightMagnetic) window.setSpotlightMagnetic(false);

        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }

        if (card.dataset.ready === "true") {
          resetActiveState();
        }
      });

      // Click: On desktop, needs "ready" state. On touch, opens immediately.
      card.addEventListener("click", () => {
        if (isTouch || card.dataset.ready === "true") {
          const item = items[index];
          openOverlay(item);
        }
      });
    });
  }

  renderCarousel();

  // --- DRAG INTERACTION LOGIC ---
  let isDragging = false;
  let startX = 0,
    startY = 0;
  let currentRotY = 0;
  let currentRotX = -10;

  gsap.set(ring, { rotationY: currentRotY, rotationX: currentRotX });
  heroSection.style.cursor = "grab";

  const onDown = (x, y, e) => {
    isDragging = true;
    startX = x;
    startY = y;
    heroSection.style.cursor = "grabbing";
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    // If we're clicking the active card that's already 'ready', don't reset it immediately
    // so the click event can still trigger the overlay.
    if (activeCard) {
      const isClickingActive = activeCard.contains(e.target);
      if (!isClickingActive) {
        resetActiveState();
      }
    }
  };

  const onMove = (x, y) => {
    if (!isDragging) return;
    const deltaX = x - startX;
    const deltaY = y - startY;
    const targetRotY = currentRotY + deltaX * 0.3;
    const targetRotX = currentRotX - deltaY * 0.3;
    const clampedRotX = Math.max(-60, Math.min(60, targetRotX));
    gsap.to(ring, {
      rotationY: targetRotY,
      rotationX: clampedRotX,
      duration: 0.5,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const onUp = () => {
    if (!isDragging) return;
    isDragging = false;
    heroSection.style.cursor = "grab";
    currentRotY = gsap.getProperty(ring, "rotationY");
    currentRotX = gsap.getProperty(ring, "rotationX");
  };

  heroSection.addEventListener("mousedown", (e) =>
    onDown(e.clientX, e.clientY, e),
  );
  window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
  window.addEventListener("mouseup", onUp);

  heroSection.addEventListener(
    "touchstart",
    (e) => onDown(e.touches[0].clientX, e.touches[0].clientY, e),
    { passive: true },
  );
  window.addEventListener(
    "touchmove",
    (e) => onMove(e.touches[0].clientX, e.touches[0].clientY),
    { passive: true },
  );
  window.addEventListener("touchend", onUp);

  // Resize Handler
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      renderCarousel();
      // Maintain current rotation after re-injection
      gsap.set(ring, { rotationY: currentRotY, rotationX: currentRotX });
    }, 250);
  });

  // Overlay Logic
  function openOverlay(item) {
    if (!overlay || !item) return;

    // Populate
    const content = document.getElementById("overlayContent");
    const imgContainer = document.getElementById("overlayImgContainer");
    const img = document.getElementById("overlayImg");
    const title = document.getElementById("overlayTitle");
    const desc = document.getElementById("overlayDesc");
    const tag = document.getElementById("overlayTag");

    if (img) img.src = item.mediaSrc;
    if (title) title.innerText = item.title;
    if (desc) desc.innerText = item.description || "Digital showcase.";
    if (tag) tag.innerText = (item.tags && item.tags[0]) || "Project";

    // Set initial states for animation elements
    gsap.set([imgContainer, title, desc, tag], { opacity: 0, y: 20 });
    gsap.set(content, { opacity: 0, scale: 0.95, y: 30 });

    // Glitch Transition Trigger
    const glitch = document.getElementById("glitchOverlay");
    if (glitch) {
      glitch.classList.add("glitch-active");
      setTimeout(() => {
        glitch.classList.remove("glitch-active");
      }, 400);
    }

    // GSAP Timeline for sophisticated entrance
    const tl = gsap.timeline({
      onStart: () => {
        overlay.classList.remove("pointer-events-none");
        overlay.classList.add("pointer-events-auto");
        document.body.style.overflow = "hidden";
      },
    });

    tl.to(overlay, {
      autoAlpha: 1,
      duration: 0.4,
      ease: "power2.out",
    })
      .to(
        content,
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.8,
          ease: "power4.out",
        },
        "-=0.2",
      )
      .to(
        imgContainer,
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
        },
        "-=0.6",
      )
      .to(
        [tag, title, desc],
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
        },
        "-=0.6",
      );
  }

  function closeOverlayFn() {
    const overlay = document.getElementById("projectOverlay");
    const content = document.getElementById("overlayContent");
    if (!overlay) return;

    const tl = gsap.timeline({
      onComplete: () => {
        overlay.classList.add("pointer-events-none");
        overlay.classList.remove("pointer-events-auto");
        document.body.style.overflow = "";
      },
    });

    tl.to(content, {
      scale: 0.95,
      y: 20,
      opacity: 0,
      duration: 0.4,
      ease: "power2.in",
    }).to(
      overlay,
      {
        autoAlpha: 0,
        duration: 0.3,
        ease: "none",
      },
      "-=0.2",
    );
  }

  if (closeBtn) closeBtn.addEventListener("click", closeOverlayFn);

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlayFn();
    });
  }
}

// ---------- Cinematic Dust Motes ----------
function initDustParticles() {
  const canvas = document.getElementById("dustCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let particles = [];
  const particleCount = 200; // Increased density

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resize);
  resize();

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5; // Slightly larger range
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = Math.random() * 0.4 + 0.1;
      this.opacity = Math.random() * 0.6 + 0.1; // Slightly more visible
      this.vel = Math.random() * 0.02;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      // Wrap around
      if (this.y > canvas.height) {
        this.y = -5;
        this.x = Math.random() * canvas.width;
      }
      if (this.x > canvas.width) this.x = 0;
      if (this.x < 0) this.x = canvas.width;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }

  animate();
}

// ---------- Cinematic Global Spotlight Cursor ----------
function initGlobalSpotlight() {
  const spotlight = document.getElementById("globalSpotlight");
  if (!spotlight) return;

  let isMagnetic = false;
  let targetX = 0;
  let targetY = 0;
  let mouseX = 0;
  let mouseY = 0;

  // Use GSAP quickSetter for better performance
  const setX = gsap.quickSetter(spotlight, "x", "px");
  const setY = gsap.quickSetter(spotlight, "y", "px");

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isMagnetic) {
      setX(mouseX);
      setY(mouseY);
    }

    // Auto-show on first move if not already visible
    if (gsap.getProperty(spotlight, "opacity") === 0) {
      gsap.to(spotlight, { opacity: 1, duration: 1 });
    }
  });

  // GSAP Ticker for smooth magnetic interpolation
  gsap.ticker.add(() => {
    if (isMagnetic) {
      // 0.2 interpolation for a smooth "attraction" feel
      const dx = targetX - mouseX;
      const dy = targetY - mouseY;

      const currentX = gsap.getProperty(spotlight, "x");
      const currentY = gsap.getProperty(spotlight, "y");

      // Attraction: move towards (mouseX + half of distance to card center)
      const attrX = mouseX + dx * 0.4;
      const attrY = mouseY + dy * 0.4;

      setX(gsap.utils.interpolate(currentX, attrX, 0.2));
      setY(gsap.utils.interpolate(currentY, attrY, 0.2));
    }
  });

  // Global methods to toggle state (called from cards)
  window.setSpotlightMagnetic = function (state, x = 0, y = 0) {
    isMagnetic = state;
    targetX = x;
    targetY = y;

    if (state) {
      spotlight.classList.add("spotlight-magnetic");
    } else {
      spotlight.classList.remove("spotlight-magnetic");
    }
  };

  // Handle visibility when leaving/entering window
  document.addEventListener("mouseleave", () => {
    gsap.to(spotlight, { opacity: 0, duration: 0.5 });
  });
  document.addEventListener("mouseenter", () => {
    gsap.to(spotlight, { opacity: 1, duration: 0.5 });
  });
}

// ---------- Cinematic Lens Flare ----------
function initLensFlare() {
  const container = document.getElementById("lensFlareContainer");
  const ghosts = document.querySelectorAll(".flare-ghost");
  const streak = document.querySelector(".flare-streak");
  const hero = document.getElementById("heroCarousel");

  if (!container || !hero) return;

  const quickSetters = Array.from(ghosts).map((ghost, i) => ({
    setterX: gsap.quickSetter(ghost, "x", "px"),
    setterY: gsap.quickSetter(ghost, "y", "px"),
    factor: (i + 1) * 0.2, // Different parallax speeds
  }));

  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Center of hero
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Relative to center
    const relX = x - centerX;
    const relY = y - centerY;

    quickSetters.forEach((qs) => {
      // Move ghosts in opposite direction for parallax
      qs.setterX(centerX - relX * qs.factor);
      qs.setterY(centerY - relY * qs.factor);
    });

    // Subtle scale for streak based on distance from center
    if (streak) {
      const dist = Math.sqrt(relX * relX + relY * relY);
      const scale = 1 + dist / 1000;
      gsap.to(streak, { scaleX: scale, duration: 0.2 });
    }
  });

  hero.addEventListener("mouseenter", () => {
    gsap.to(container, { opacity: 1, duration: 0.8 });
  });

  hero.addEventListener("mouseleave", () => {
    gsap.to(container, { opacity: 0, duration: 0.8 });
  });
}

// ---------- Cinematic Scrolling Marquee ----------
function initMarquee() {
  const track = document.getElementById("marqueeTrack");
  if (!track) return;

  // We loop to -50% because the content is duplicated for a seamless loop
  gsap.to(track, {
    xPercent: -50,
    duration: 30, // Slow cinematic speed
    ease: "none",
    repeat: -1,
  });
}

// Initial Main Execution
try {
  initHeroCarousel();
  initDustParticles();
  initGlobalSpotlight();
  initLensFlare();
  initMarquee();
} catch (e) {
  console.error("Initialization Failed:", e);
}

try {
  renderFilters();
} catch (e) {
  console.error("Render Filters Failed:", e);
}

try {
  renderMasonry();
} catch (e) {
  console.error("Render Masonry Failed:", e);
}

// ---------- Side Menu Panel (GSAP Dots to X Animation) ----------
function toggleMenu() {
  const mobileMenu = document.getElementById("mobileMenu");
  const backdrop = document.getElementById("sideMenuBackdrop");
  const dotsContainer = document.getElementById("menuIconDots");

  if (!mobileMenu || !backdrop || !dotsContainer) return;

  const dots = dotsContainer.querySelectorAll(".dot");
  const isOpen = mobileMenu.classList.contains("menu-open");

  if (!isOpen) {
    // OPEN
    mobileMenu.classList.add("menu-open");
    backdrop.classList.add("menu-open");
    mobileMenu.setAttribute("data-open", "true");

    // KINETIC DOTS TO X ANIMATION
    const tl = gsap.timeline();
    // Fade out middle edge dots
    tl.to([dots[1], dots[3], dots[5], dots[7]], {
      opacity: 0,
      scale: 0,
      duration: 0.3,
      ease: "power2.inOut",
    });
    // Move corners to form X strokes
    tl.to(dots[0], { x: 4, y: 4, duration: 0.4 }, 0);
    tl.to(dots[2], { x: -4, y: 4, duration: 0.4 }, 0);
    tl.to(dots[6], { x: 4, y: -4, duration: 0.4 }, 0);
    tl.to(dots[8], { x: -4, y: -4, duration: 0.4 }, 0);
    // Center dot pulses
    tl.to(dots[4], { scale: 1.2, duration: 0.4 }, 0);
  } else {
    // CLOSE
    mobileMenu.classList.remove("menu-open");
    backdrop.classList.remove("menu-open");
    mobileMenu.setAttribute("data-open", "false");

    // REVERSE DOTS ANIMATION
    gsap.to(dots, {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: "power2.out",
    });
  }
}

// Initial Setup for Sidebar Listeners
function initMenuListeners() {
  const toggle = document.getElementById("menuToggle");
  const backdrop = document.getElementById("sideMenuBackdrop");
  const links = document.querySelectorAll(".menu-link");

  if (toggle) toggle.addEventListener("click", toggleMenu);
  if (backdrop) backdrop.addEventListener("click", toggleMenu);

  links.forEach((link) => {
    link.addEventListener("click", () => {
      if (
        document.getElementById("mobileMenu").classList.contains("menu-open")
      ) {
        toggleMenu();
      }
    });
  });
}

// Global Execution
document.addEventListener("DOMContentLoaded", () => {
  try {
    initHeroCarousel();
    initDustParticles();
    initGlobalSpotlight();
    initLensFlare();
    initMarquee();
    initMenuListeners();
    renderFilters();
    renderMasonry();
  } catch (e) {
    console.error("Initialization Failed:", e);
  }
});
