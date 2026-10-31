/**
 * VEER & AANYA — Royal Wedding · Cinematic Scroll-Driven Reveal
 *
 * Scroll mechanics:
 *   - Viewport is locked. The page never moves.
 *   - Wheel / touch / keyboard events drive a virtual "scrollY" value.
 *   - That scrollY is lerped to create silky momentum.
 *   - Lerped value maps to a GSAP paused timeline progress (0–1).
 *
 * Animation phases (progress 0 → 1):
 *   Phase 1 (0.00–0.40) Divine hand descends from upper-right
 *   Phase 1 (0.05–0.45) Bridal hand rises from lower-left
 *   Phase 2 (0.25–0.50) Lotus glow ignites
 *   Phase 3 (0.35–0.55) Border drawn, corners bloom
 *   Phase 4 (0.42–0.58) Sanskrit invocation rises
 *   Phase 5 (0.50–0.80) Names bloom letter by letter
 *   Phase 6 (0.72–0.90) Divider, blessing, details settle
 */

(function () {
'use strict';

/* ─── State ────────────────────────────────────────────────────────────── */
let scrollProgress = 0;  // 0–1, current lerped progress
let targetProgress = 0;  // 0–1, target from user input
let timeline = null;
let initiated = false;
const HAND_ANIM_END = 0.38; // Male & bridal hand animations end and settle here
let NAMES_ANIM_END = 0.82;  // Exact milestone where text (names) animation ends

/* ─── Boot: wait for assets ────────────────────────────────────────────── */
const imgs = [
  document.querySelector('.hand-divine img'),
  document.querySelector('.hand-bridal img')
].filter(Boolean);

let loaded = 0;
const onLoad = () => { if (++loaded >= imgs.length) boot(); };
if (imgs.length === 0) { boot(); }
else {
  imgs.forEach(img => {
    if (img.complete) onLoad();
    else { img.addEventListener('load', onLoad); img.addEventListener('error', onLoad); }
  });
  setTimeout(boot, 2500); // safety fallback: assets load in <300ms now
}

/* ─── Boot ──────────────────────────────────────────────────────────────── */
function boot() {
  if (initiated) return;
  initiated = true;

  // Remove veil
  const veil = document.getElementById('veil');
  if (veil) {
    setTimeout(() => { veil.classList.add('gone'); }, 600);
    setTimeout(() => { veil.style.display = 'none'; }, 2000);
  }

  // Show scroll hint after veil lifts
  const hint = document.getElementById('scroll-hint');
  if (hint) setTimeout(() => hint.classList.add('visible'), 1600);

  // Start gold dust
  initDust();

  // Start ultra-realistic rose & lotus petals engine
  initPetalsEngine();

  // Audio: initialize immediately so ready for instant scroll trigger
  initAudio();

  // Build scroll timeline
  if (typeof gsap !== 'undefined') {
    setInitial();
    timeline = buildTimeline();
    startScrollEngine();
  }

  // Audio button
  const audioBtn = document.getElementById('audio-btn');
  if (audioBtn) setTimeout(() => audioBtn.classList.add('ready'), 2000);

  // Dynamic candlelight lighting sheen — pointer (desktop) + touch (mobile)
  const vignette = document.querySelector('.vignette');
  if (vignette) {
    function applyVignette(clientX, clientY) {
      const x = (clientX / window.innerWidth) * 100;
      const y = (clientY / window.innerHeight) * 100;
      vignette.style.background = `radial-gradient(ellipse 90% 85% at ${x}% ${y}%, transparent 58%, rgba(180, 140, 60, 0.08) 82%, rgba(140, 95, 30, 0.16) 100%)`;
    }
    window.addEventListener('pointermove', (e) => applyVignette(e.clientX, e.clientY), { passive: true });
    // Mobile: also apply on touch so users get the ambient glow effect
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) applyVignette(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
  }
}

/* ─── Initial States ────────────────────────────────────────────────────── */
function setInitial() {
  const isMobile = window.innerWidth <= 768;
  // Reduced offsets match the smaller mobile hand sizes (58vw vs 72vw)
  const divineOffset = isMobile ? '38%' : '40%';
  const bridalOffset = isMobile ? '38%' : '40%';

  /*
   * Male / Divine hand (upper-right):
   * Starts retracted beyond the top-right corner with a slight outward tilt (+14deg).
   * As user scrolls down, it glides down-left and rotates ANTICLOCKWISE to 0deg,
   * mimicking a real human arm extending downward to offer the sacred lotus.
   */
  gsap.set('#hand-divine', {
    x: divineOffset,
    y: '-' + divineOffset,
    rotation: 14,
    opacity: 1
  });

  /*
   * Female / Bridal hand (lower-left):
   * Starts retracted beyond the bottom-left corner with an inward tilt (-14deg).
   * As user scrolls down, it glides up-right and rotates CLOCKWISE to 0deg,
   * mimicking a real human bride lifting and opening her henna-adorned palm.
   */
  gsap.set('#hand-bridal', {
    x: '-' + bridalOffset,
    y: bridalOffset,
    rotation: -14,
    opacity: 1
  });

  // Lotus glow invisible initially
  gsap.set('#lotus-glow', { opacity: 0, scale: 0.7 });

  // Typography hidden initially — central space reserved for the names
  gsap.set('#royal-crest', { opacity: 0, y: 12, scale: 0.9 });
  gsap.set('#txt-invocation', { opacity: 0, y: 14 });

  // Cursive letter glyphs: slanted clip-path tucked at left, hidden initially
  gsap.set('.cl-glyph', {
    clipPath: 'polygon(0% 0%, 0% 0%, -18% 100%, 0% 100%)',
    opacity: 0
  });

  // Calligraphy pen nibs: hidden initially at left 0%
  gsap.set('.cl-nib', {
    left: '0%',
    opacity: 0,
    scale: 0.6
  });

  // Partner honorifics
  gsap.set('.partner-side', { opacity: 0, y: 10 });
}

/* ─── Build Timeline ────────────────────────────────────────────────────── */
function buildTimeline() {
  const tl = gsap.timeline({ paused: true });

  /*
   * Phase 1: Real human hand choreography
   * — Male hand: sweeps down-left with smooth ANTICLOCKWISE rotation (+14deg -> 0deg)
   * — Female hand: sweeps up-right with smooth CLOCKWISE rotation (-14deg -> 0deg)
   */
  tl.to('#hand-divine', {
    x: '0%',
    y: '0%',
    rotation: 0,
    duration: HAND_ANIM_END,
    ease: 'power2.out'
  }, 0.0);

  tl.to('#hand-bridal', {
    x: '0%',
    y: '0%',
    rotation: 0,
    duration: HAND_ANIM_END,
    ease: 'power2.out'
  }, 0.0);

  // Phase 2a: Royal Wedding Monogram Crest reveals
  tl.to('#royal-crest', {
    opacity: 1, y: 0, scale: 1,
    duration: 0.30, ease: 'power2.out'
  }, 0.18);

  // Phase 2b: Sacred pink lotus illuminates with celestial glow at mid-scroll
  tl.to('#lotus-glow', {
    opacity: 0.88, scale: 1,
    duration: 0.45, ease: 'power2.inOut'
  }, 0.22);

  // Phase 3: Sanskrit invocation rises in upper central space
  tl.to('#txt-invocation', {
    opacity: 1, y: 0,
    duration: 0.28, ease: 'power2.out'
  }, 0.26);

  /*
   * Phase 4: LETTER-BY-LETTER CURSIVE HANDWRITING ANIMATION
   *
   * Each cursive letter is written sequentially, like a royal golden quill
   * gliding across the wasli paper:
   *   1. The glowing pen nib ignites at the letter's start (left: 0%).
   *   2. The nib glides across to 100% along the italic cursive slant.
   *   3. Simultaneously, the gold foil cursive glyph sweeps into view via an angled clip-path.
   *   4. As the letter completes, the nib lifts and flows into the next letter.
   */
  function writeLetter(charEl, startTime, duration) {
    if (!charEl) return;
    const glyph = charEl.querySelector('.cl-glyph');
    const nib = charEl.querySelector('.cl-nib');

    // 1. Nib touches paper & ignites
    if (nib) {
      tl.to(nib, {
        opacity: 1,
        scale: 1.3,
        duration: duration * 0.2,
        ease: 'power2.out'
      }, startTime);

      // 2. Nib glides from 0% to 100%
      tl.to(nib, {
        left: '100%',
        duration: duration,
        ease: 'power1.inOut'
      }, startTime);

      // 3. Nib lifts and fades at end of stroke
      tl.to(nib, {
        opacity: 0,
        scale: 0.6,
        duration: duration * 0.25,
        ease: 'power2.in'
      }, startTime + duration * 0.8);
    }

    // Glyphs reveal with angled cursive clip-path
    if (glyph) {
      tl.to(glyph, {
        clipPath: 'polygon(0% 0%, 120% 0%, 100% 100%, 0% 100%)',
        opacity: 1,
        duration: duration,
        ease: 'power1.inOut'
      }, startTime);
    }
  }

  // Groom letters: V - e - e - r
  const groomLetters = gsap.utils.toArray('#grp-groom .cl');
  let t = 0.36;

  // 'V' (majestic capital stroke)
  if (groomLetters[0]) { writeLetter(groomLetters[0], t, 0.080); t += 0.075; }
  // 'e' (connected loop)
  if (groomLetters[1]) { writeLetter(groomLetters[1], t, 0.055); t += 0.052; }
  // 'e' (connected loop)
  if (groomLetters[2]) { writeLetter(groomLetters[2], t, 0.055); t += 0.052; }
  // 'r' (finishing flourish)
  if (groomLetters[3]) { writeLetter(groomLetters[3], t, 0.065); t += 0.065; }

  // Groom honorific (वर • The Groom)
  tl.to('#side-groom', {
    opacity: 1, y: 0,
    duration: 0.22, ease: 'power2.out'
  }, t);

  t += 0.04;

  // Ampersand '&' (calligraphic swirl)
  const ampEl = document.querySelector('#txt-amp .cl');
  if (ampEl) {
    writeLetter(ampEl, t, 0.080);
    t += 0.080;
  }

  // Bride letters: A - a - n - y - a
  const brideLetters = gsap.utils.toArray('#grp-bride .cl');

  // 'A' (grand royal capital)
  if (brideLetters[0]) { writeLetter(brideLetters[0], t, 0.085); t += 0.080; }
  // 'a'
  if (brideLetters[1]) { writeLetter(brideLetters[1], t, 0.052); t += 0.048; }
  // 'n'
  if (brideLetters[2]) { writeLetter(brideLetters[2], t, 0.052); t += 0.048; }
  // 'y' (descender loop)
  if (brideLetters[3]) { writeLetter(brideLetters[3], t, 0.068); t += 0.064; }
  // 'a' (final flourish)
  if (brideLetters[4]) { writeLetter(brideLetters[4], t, 0.058); t += 0.062; }

  // Exact timestamp when text (names) handwriting animation completes
  const namesEndTime = t;
  tl.addLabel('namesEnd', namesEndTime);

  // Bride honorific (वधू • The Bride)
  tl.to('#side-bride', {
    opacity: 1, y: 0,
    duration: 0.22, ease: 'power2.out'
  }, t);

  // Lotus breathing starts when hands reach final position
  tl.call(() => {
    const halo = document.getElementById('lotus-glow');
    if (halo) halo.style.animationPlayState = 'running';
  }, [], HAND_ANIM_END);

  // Buffer so guest can enjoy full celebration with petals
  tl.to({}, { duration: 0.15 }, '+=0');

  // Compute exact normalized scroll progress for names animation end
  if (tl.labels && typeof tl.labels.namesEnd === 'number' && tl.duration() > 0) {
    NAMES_ANIM_END = tl.labels.namesEnd / tl.duration();
  }

  return tl;
}

/* ─── Scroll Engine ─────────────────────────────────────────────────────── */
function startScrollEngine() {
  const SCROLL_SPEED   = 0.0008;  // per wheel deltaY unit
  const TOUCH_SPEED    = 1.6;     // multiplier for touch swipe
  const LERP_FACTOR    = 0.055;   // smoothing — lower = more silky
  const hint = document.getElementById('scroll-hint');

  let touchStartY = 0;

  // Wheel
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY * SCROLL_SPEED;
    targetProgress = Math.max(0, Math.min(1, targetProgress + delta));
    triggerAudioOnScroll();
  }, { passive: false });

  // Touch start
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    triggerAudioOnScroll();
  }, { passive: true });

  // Touch move
  window.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const dy = touchStartY - e.touches[0].clientY;
    touchStartY = e.touches[0].clientY;
    const delta = (dy / window.innerHeight) * TOUCH_SPEED;
    targetProgress = Math.max(0, Math.min(1, targetProgress + delta));
    triggerAudioOnScroll();
  }, { passive: false });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if      (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); targetProgress = Math.min(1, targetProgress + 0.12); triggerAudioOnScroll(); }
    else if (e.key === 'ArrowUp')                    { e.preventDefault(); targetProgress = Math.max(0, targetProgress - 0.12); triggerAudioOnScroll(); }
    else if (e.key === 'End')                        { e.preventDefault(); targetProgress = 1; triggerAudioOnScroll(); }
    else if (e.key === 'Home')                       { e.preventDefault(); targetProgress = 0; triggerAudioOnScroll(); }
  });

  // Render loop
  function tick() {
    // Lerp toward target
    const diff = targetProgress - scrollProgress;
    if (Math.abs(diff) > 0.00005) {
      scrollProgress += diff * LERP_FACTOR;
      if (timeline) timeline.progress(scrollProgress);

      // Hint fades once user starts scrolling
      if (hint && scrollProgress > 0.04) hint.classList.add('hidden');
      if (hint && scrollProgress < 0.01) hint.classList.remove('hidden');

      // Boost petals flutter with scroll motion
      if (window.petalEngineBoost) window.petalEngineBoost(diff);

      // Immediately trigger audio playback upon scroll progress
      if (scrollProgress > 0.002) triggerAudioOnScroll();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ─── Gold Dust Canvas ──────────────────────────────────────────────────── */
function initDust() {
  const canvas = document.getElementById('dust');
  if (!canvas) return;

  // Size canvas to scene (its parent), not window
  const scene = canvas.closest('.scene') || canvas.parentElement;
  const resize = () => {
    canvas.width = scene.offsetWidth;
    canvas.height = scene.offsetHeight;
  };
  resize();
  new ResizeObserver(resize).observe(scene);

  const ctx = canvas.getContext('2d');
  // Fewer, more refined particles on mobile — premium subtlety over quantity
  const COUNT = window.innerWidth < 640 ? 12 : 40;
  const particles = [];

  const W = () => canvas.width;
  const H = () => canvas.height;

  for (let i = 0; i < COUNT; i++) particles.push(make(true));

  const isMobileDevice = window.innerWidth < 640;
  function make(scatter) {
    // Smaller, more refined particles on mobile
    const maxR = isMobileDevice ? 0.8 : 1.2;
    const r = Math.random() * maxR + 0.15;
    return {
      x: Math.random() * W(),
      y: scatter ? Math.random() * H() : H() + 8,
      r, vx: (Math.random() - 0.5) * 0.14,
      vy: -(Math.random() * 0.18 + 0.04),
      // Lower base alpha on mobile for refined, non-distracting shimmer
      a:  isMobileDevice ? (Math.random() * 0.22 + 0.06) : (Math.random() * 0.4 + 0.1),
      ph: Math.random() * Math.PI * 2,
      ps: Math.random() * 0.016 + 0.006,
      hue: 40 + Math.random() * 16,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W(), H());
    for (let i = 0, n = particles.length; i < n; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.ph += p.ps;
      if (p.y < -10) { particles[i] = make(false); continue; }
      if (p.x < -10) p.x = W() + 10;
      if (p.x > W() + 10) p.x = -10;
      const a = Math.max(0.02, p.a + Math.sin(p.ph) * 0.14);
      ctx.save();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      g.addColorStop(0, `hsla(${p.hue},80%,82%,${a})`);
      g.addColorStop(1, `hsla(${p.hue},70%,60%,0)`);
      ctx.fillStyle = g;
      ctx.shadowColor = `hsla(${p.hue},90%,70%,${a*0.5})`;
      ctx.shadowBlur = p.r * 5;
      ctx.fill(); ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

/* ─── Audio ─────────────────────────────────────────────────────────────── */
let audio = null;
let audioPlaying = false;
let audioStarted = false;
let userMutedManually = false;

function triggerAudioOnScroll() {
  if (audioStarted || userMutedManually) return;
  startAudioPlayback();
}

function startAudioPlayback() {
  if (!audio || audioPlaying) return;
  audio.play().then(() => {
    audioStarted = true;
    audioPlaying = true;
    const btn = document.getElementById('audio-btn');
    if (btn) btn.classList.add('playing');
    // Smooth, regal fade-in to luxury palace volume (~0.45)
    let vol = audio.volume;
    const targetVol = 0.45;
    const fadeIn = setInterval(() => {
      vol = Math.min(targetVol, vol + 0.03);
      audio.volume = vol;
      if (vol >= targetVol) clearInterval(fadeIn);
    }, 45);
  }).catch((err) => {
    // If browser requires explicit gesture, will retry on next scroll event
  });
}

function initAudio() {
  const btn = document.getElementById('audio-btn');

  // Sacred marriage track: Shri Raghuvar
  const exactTrack = 'shri-raghuvar-jaimala.mp3';
  const src = (typeof weddingData !== 'undefined' && weddingData.bgMusicSrc)
    ? weddingData.bgMusicSrc
    : exactTrack;

  audio = new Audio(src);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;

  // Fallback to ASCII alias if server doesn't support unicode in HTTP GET
  let triedFallback = false;
  audio.addEventListener('error', () => {
    if (!triedFallback) {
      triedFallback = true;
      audio.src = 'shri-raghuvar-jaimala.mp3';
      audio.load();
      if (audioStarted || audioPlaying) {
        audio.play().catch(() => {});
      }
    }
  });

  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!audio) return;
      if (audioPlaying) {
        // User deliberately muted: respect choice and do not auto-resume on scroll
        userMutedManually = true;
        const fadeOut = setInterval(() => {
          audio.volume = Math.max(0, audio.volume - 0.03);
          if (audio.volume <= 0) {
            clearInterval(fadeOut);
            audio.pause();
            audioPlaying = false;
            btn.classList.remove('playing');
          }
        }, 45);
      } else {
        // User deliberately clicked play: un-mute
        userMutedManually = false;
        audio.play().then(() => {
          audioStarted = true;
          audioPlaying = true;
          btn.classList.add('playing');
          const fadeIn = setInterval(() => {
            audio.volume = Math.min(0.45, audio.volume + 0.03);
            if (audio.volume >= 0.45) clearInterval(fadeIn);
          }, 45);
        }).catch(() => {});
      }
    });
  }
}

/* ─── Ultra-Realistic Falling Sacred Lotus Petals Engine ────────────────────
   Simulates authentic botanical physics:
   - Exclusively sacred pink lotus petals (no red petals) matching the groom's lotus flower
   - Minimal luxury count (6 on mobile, 8 on desktop) for a serene, uncluttered aesthetic
   - Exact anchor tracking: emerges from blooming flower, floats to bride's henna palm
   - Slow, meditative 3D aerodynamic glide with Karman flutter and soft tactile shadows
────────────────────────────────────────────────────────────────────────────── */
function initPetalsEngine() {
  const canvas = document.getElementById('petals-canvas');
  if (!canvas) return;

  const scene = canvas.closest('.scene') || canvas.parentElement;
  const ctx = canvas.getContext('2d');

  // Preload only pure sacred pink lotus petals (Lossless WebP with zero quality compromise)
  const PETAL_SRCS = [
    'assets/invitation/petals/pink_petal_1.webp',
    'assets/invitation/petals/pink_petal_2.webp',
    'assets/invitation/petals/pink_petal_3.webp',
    'assets/invitation/petals/pink_petal_4.webp',
    'assets/invitation/petals/pink_petal_5.webp',
  ];

  const petalImgs = PETAL_SRCS.map(src => {
    const img = new Image();
    img.src = src;
    return img;
  });

  let sceneW = scene.offsetWidth || window.innerWidth;
  let sceneH = scene.offsetHeight || window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    sceneW = scene.offsetWidth || window.innerWidth;
    sceneH = scene.offsetHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(sceneW * dpr);
    canvas.height = Math.round(sceneH * dpr);
  }
  resize();
  window.addEventListener('resize', resize);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resize).observe(scene);
  }

  // Exact origin anchor at the blooming lotus blossom in the male hand
  function getFlowerPos() {
    const anchor = document.getElementById('flower-anchor');
    const sRect = scene.getBoundingClientRect();
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      return {
        x: r.left - sRect.left + r.width * 0.5,
        y: r.top - sRect.top + r.height * 0.5
      };
    }
    const divine = document.getElementById('hand-divine');
    if (!divine) return { x: sceneW * 0.82, y: sceneH * 0.14 };
    const dRect = divine.getBoundingClientRect();
    return {
      x: (dRect.left - sRect.left) + dRect.width * 0.265,
      y: (dRect.top - sRect.top) + dRect.height * 0.730
    };
  }

  // Exact destination anchor at the henna palm in the bridal hand
  function getPalmPos() {
    const anchor = document.getElementById('palm-anchor');
    const sRect = scene.getBoundingClientRect();
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      return {
        x: r.left - sRect.left + r.width * 0.5,
        y: r.top - sRect.top + r.height * 0.5
      };
    }
    const bridal = document.getElementById('hand-bridal');
    if (!bridal) return { x: sceneW * 0.18, y: sceneH * 0.85 };
    const bRect = bridal.getBoundingClientRect();
    return {
      x: (bRect.left - sRect.left) + bRect.width * 0.62,
      y: (bRect.top - sRect.top) + bRect.height * 0.37
    };
  }

  const isMobile = window.innerWidth <= 768;
  // Minimized luxury count: 6 on mobile, 8 on desktop for a serene, royal feel
  const COUNT = isMobile ? 6 : 8;
  const particles = [];
  let breezeX = 0;

  // Delicate resting petals in the female hand (2 on mobile, 3 on desktop — clean, precious, uncluttered)
  const MAX_RESTING = isMobile ? 2 : 3;
  const restingPetals = [];

  // Dedicated organic resting hollows relative to bridal palm center (matching delicate female hand anatomy)
  const dScale = isMobile ? 0.75 : 1.0;
  const RESTING_SLOTS = [
    { offX: 0, offY: 0, targetAngle: -0.36, rotX: 0.14, rotY: 0.05 },
    { offX: 13 * dScale, offY: -10 * dScale, targetAngle: 0.24, rotX: -0.10, rotY: 0.12 },
    { offX: -11 * dScale, offY: 9 * dScale, targetAngle: -0.60, rotX: 0.08, rotY: -0.14 },
  ];

  // External hook for scroll flurry (gentle air breeze)
  window.petalEngineBoost = function(diff) {
    breezeX = Math.max(-1.8, Math.min(1.8, breezeX - diff * 4.0));
  };

  // Pointer interaction: gentle whisper of air
  window.addEventListener('pointermove', (e) => {
    const sRect = scene.getBoundingClientRect();
    const mx = e.clientX - sRect.left;
    const my = e.clientY - sRect.top;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < 90) {
        const force = (1 - d / 90) * 0.6;
        p.x += (p.x - mx > 0 ? 1 : -1) * force * 2.5;
        p.y += force * 1.5;
        p.rotSpeedX += force * 0.02;
      }
    }
  }, { passive: true });

  function createPetal(scatter, indexFactor) {
    const depth = 0.70 + Math.random() * 0.45; // 0.70 to 1.15
    const flower = getFlowerPos();
    const palm = getPalmPos();

    let x, y;
    if (scatter) {
      // Pre-warm along trajectory line with even spacing to avoid clumping
      const t = typeof indexFactor === 'number' ? Math.max(0.04, Math.min(0.96, indexFactor + (Math.random() - 0.5) * 0.10)) : Math.random();
      const fullDx = palm.x - flower.x;
      const fullDy = palm.y - flower.y;
      const len = Math.hypot(fullDx, fullDy) || 1;
      const perpX = -fullDy / len;
      const perpY = fullDx / len;
      // Natural lateral arch
      const arch = Math.sin(t * Math.PI) * (isMobile ? 25 : 55);
      const randomSpread = (Math.random() - 0.5) * (isMobile ? 35 : 50);

      x = flower.x + fullDx * t + perpX * (arch + randomSpread);
      y = flower.y + fullDy * t + perpY * (arch + randomSpread);
    } else {
      // Spawn right at the blooming lotus petals
      x = flower.x + (Math.random() - 0.5) * 22;
      y = flower.y + (Math.random() - 0.5) * 16;
    }

    return {
      x, y,
      depth,
      img: petalImgs[Math.floor(Math.random() * petalImgs.length)],
      // Proportional scale to the lotus flower (~30-38px mobile, ~40-52px desktop)
      baseScale: (isMobile ? 0.11 : 0.16) * depth * (0.90 + Math.random() * 0.20),
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      angleZ: -0.3 + (Math.random() - 0.5) * 0.8,
      // Slow, meditative, realistic tumble speeds
      rotSpeedX: 0.007 + Math.random() * 0.007,
      rotSpeedY: 0.004 + Math.random() * 0.005,
      rotSpeedZ: -0.002 + (Math.random() - 0.5) * 0.004,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.012 + Math.random() * 0.008,
      swayAmp: isMobile ? 18 : 28,
      // Slow, peaceful, luxury floating speed (serene cinematic motion)
      speed: (0.50 + Math.random() * 0.30) * depth,
      alpha: scatter ? (0.45 + Math.random() * 0.45) : 0,
      targetAlpha: 0.88 + Math.random() * 0.10,
    };
  }

  // UI/UX Sacred Reveal Engine:
  // Petals stay strictly dormant while text (names) animation is in progress (scrollProgress < NAMES_ANIM_END).
  // The moment the text (names) animation ends (scrollProgress >= NAMES_ANIM_END),
  // flower petals ONLY and IMMEDIATELY start releasing from the sacred lotus blossom.
  let currentFlowAlpha = 0;
  let spawnCooldown = 0;

  // Render loop
  function draw() {
    // Flower petals ONLY and IMMEDIATELY start at the moment text (names) animation ends
    let targetFlowAlpha = 0;
    if (scrollProgress >= NAMES_ANIM_END) {
      targetFlowAlpha = 1.0;
      // Immediately start the moment text (names) animation ends
      if (currentFlowAlpha < 0.15) {
        currentFlowAlpha = 0.95;
        spawnCooldown = 0; // Immediately release first petal
      }
    } else {
      targetFlowAlpha = 0;
    }

    // Snappy fade out if scrolling backward before names finish
    currentFlowAlpha += (targetFlowAlpha - currentFlowAlpha) * 0.18;

    // Fast-path: strictly dormant before text (names) finishes animation
    if (currentFlowAlpha < 0.005) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (scrollProgress < NAMES_ANIM_END) {
        if (particles.length > 0) particles.length = 0;
        if (restingPetals.length > 0) restingPetals.length = 0;
      }
      requestAnimationFrame(draw);
      return;
    }

    // Organically spawn petals one by one from the blooming lotus flower
    if (currentFlowAlpha > 0.05 && particles.length < COUNT) {
      spawnCooldown--;
      if (spawnCooldown <= 0) {
        // If user rapidly jumped/flung deep into the invitation, populate the trajectory smoothly
        if (scrollProgress > NAMES_ANIM_END + 0.10 && particles.length === 0) {
          for (let k = 0; k < COUNT; k++) {
            particles.push(createPetal(true, (k + 0.5) / COUNT));
          }
        } else {
          particles.push(createPetal(false));
          // Natural botanical stagger: release next petal every ~18-26 frames (~300-400ms)
          spawnCooldown = 18 + Math.floor(Math.random() * 8);
        }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const flower = getFlowerPos();
    const palm = getPalmPos();

    // Wind direction unit vector from flower to palm
    const fullDx = palm.x - flower.x;
    const fullDy = palm.y - flower.y;
    const fullDist = Math.hypot(fullDx, fullDy) || 1;
    const streamDirX = fullDx / fullDist;
    const streamDirY = fullDy / fullDist;

    // Decay scroll breeze gently
    breezeX *= 0.95;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Aerodynamic lift & drag coupling
      const flat = Math.abs(Math.cos(p.rotX));
      // When flat: air cushions the petal (slower descent, increased lateral float)
      // When tilted: slices through air with natural downward glide
      const fallRate = (0.75 + (1 - flat) * 0.55) * p.speed;

      // Primary motion along diagonal stream
      let vx = streamDirX * fallRate + (breezeX * p.depth);
      let vy = streamDirY * fallRate;

      // Minimum downward drift floor
      if (vy < 0.20) vy = 0.20 * p.depth;

      // Lateral Karman aerodynamic sway (perpendicular to stream)
      const perpX = -streamDirY;
      const perpY = streamDirX;
      p.wobblePhase += p.wobbleSpeed;
      const swayForce = Math.sin(p.wobblePhase) * (p.swayAmp * 0.022) * (0.6 + flat * 0.6);

      p.x += vx + perpX * swayForce;
      p.y += vy + perpY * swayForce;

      // Slow 3D Tumbling & Rotations
      p.rotX += p.rotSpeedX;
      p.rotY += p.rotSpeedY;
      p.angleZ += p.rotSpeedZ + Math.cos(p.wobblePhase) * 0.002;

      // Alpha lifecycle: fade in softly near flower
      if (p.alpha < p.targetAlpha && p.y < sceneH * 0.80) {
        p.alpha = Math.min(p.targetAlpha, p.alpha + 0.016);
      }

      // Check proximity to palm: land delicately in the female hand or drift past
      const distToPalm = Math.hypot(p.x - palm.x, p.y - palm.y);

      // If female hand has room, this arriving petal lands and stays in her palm!
      if (restingPetals.length < MAX_RESTING && distToPalm < 46 && p.alpha > 0.35) {
        const slotIdx = restingPetals.length;
        const slot = RESTING_SLOTS[slotIdx];
        restingPetals.push({
          img: p.img,
          slotOffX: slot.offX,
          slotOffY: slot.offY,
          currentX: p.x,
          currentY: p.y,
          // Small, refined proportion matching the female hand size (~55% of aerial petal)
          targetScale: (isMobile ? 0.058 : 0.082) * (0.90 + Math.random() * 0.16),
          currentScale: p.baseScale,
          angle: p.angleZ,
          targetAngle: slot.targetAngle + (Math.random() - 0.5) * 0.12,
          rotX: slot.rotX,
          rotY: slot.rotY,
          alpha: p.alpha,
          breathePhase: Math.random() * Math.PI * 2,
          breatheSpeed: 0.016 + Math.random() * 0.008,
        });

        // Immediately spawn replacement aerial petal from blooming flower
        particles[i] = createPetal(false);
        continue;
      }

      // If female hand is already adorned with resting petals, subsequent petals gently drift & fade
      if (distToPalm < 80) {
        p.speed *= 0.982;
        p.alpha -= 0.015;
      }

      // Fade out when reaching bottom or left edge
      if (p.x < sceneW * 0.04 || p.y > sceneH * 0.92 || p.x > sceneW + 30) {
        p.alpha -= 0.018;
      }

      // Recycle when faded out or past bounds
      if (p.alpha <= 0 || p.x < -40 || p.y > sceneH + 40) {
        if (currentFlowAlpha > 0.12) {
          particles[i] = createPetal(false);
        } else {
          particles.splice(i, 1);
          i--;
        }
        continue;
      }

      // Draw the photorealistic pink lotus petal
      const img = p.img;
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      const cosX = Math.cos(p.rotX);
      const cosY = Math.cos(p.rotY);
      const scaleX = p.baseScale * (0.28 + 0.72 * Math.abs(cosX));
      const scaleY = p.baseScale * (0.48 + 0.52 * Math.abs(cosY));

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angleZ);
      // Realistic 3D flip inversion (front vs back of petal)
      ctx.scale(scaleX * (cosX >= 0 ? 1 : -1), scaleY * (cosY >= 0 ? 1 : -1));

      // Delicate organic tactile shadow on ivory paper modulated by flow alpha
      const shadowAlpha = 0.16 * p.depth * p.alpha * currentFlowAlpha;
      ctx.shadowColor = `rgba(55, 18, 30, ${shadowAlpha})`;
      ctx.shadowBlur = 8 * p.depth;
      ctx.shadowOffsetX = 2.5 * p.depth;
      ctx.shadowOffsetY = 4.5 * p.depth;

      // Velvet palace candlelight specular sheen with global flow alpha
      const sheen = 0.92 + 0.08 * cosX;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * sheen * currentFlowAlpha));

      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);

      ctx.restore();
    }

    // Draw delicate miniature petals resting peacefully in the female hand
    for (let j = 0; j < restingPetals.length; j++) {
      const rp = restingPetals[j];
      const targetX = palm.x + rp.slotOffX;
      const targetY = palm.y + rp.slotOffY;

      // Soft landing interpolation: eases into palm hollow
      rp.currentX += (targetX - rp.currentX) * 0.14;
      rp.currentY += (targetY - rp.currentY) * 0.14;
      rp.currentScale += (rp.targetScale - rp.currentScale) * 0.10;
      rp.angle += (rp.targetAngle - rp.angle) * 0.12;
      rp.alpha = Math.min(1.0, rp.alpha + 0.025);

      // Micro-subtle organic breathing flutter (petals feel alive and resting naturally on skin)
      rp.breathePhase += rp.breatheSpeed;
      const microSway = Math.sin(rp.breathePhase) * 0.020;
      const microTilt = Math.cos(rp.breathePhase) * 0.032;

      const img = rp.img;
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      const cosX = Math.cos(rp.rotX + microTilt);
      const cosY = Math.cos(rp.rotY);
      const scaleX = rp.currentScale * (0.28 + 0.72 * Math.abs(cosX));
      const scaleY = rp.currentScale * (0.48 + 0.52 * Math.abs(cosY));

      ctx.save();
      ctx.translate(rp.currentX, rp.currentY);
      ctx.rotate(rp.angle + microSway);
      ctx.scale(scaleX * (cosX >= 0 ? 1 : -1), scaleY * (cosY >= 0 ? 1 : -1));

      // Delicate tactile shadow directly on the bridal hand skin & mehndi
      const shadowAlpha = 0.24 * currentFlowAlpha * rp.alpha;
      ctx.shadowColor = `rgba(50, 16, 26, ${shadowAlpha})`;
      ctx.shadowBlur = 4 * dpr;
      ctx.shadowOffsetX = 1.2 * dpr;
      ctx.shadowOffsetY = 2.0 * dpr;

      // Velvet palace candlelight sheen
      const sheen = 0.94 + 0.06 * cosX;
      ctx.globalAlpha = Math.max(0, Math.min(1, rp.alpha * sheen * currentFlowAlpha));

      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);

      ctx.restore();
    }

    ctx.restore();
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

})();

