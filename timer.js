'use strict';

const STORAGE_KEY = 'cubecount:config:v1';
const FONT_ROOTS = document.documentElement;
const LOCAL_FONTS = new Set(['Jujutsu Kaisen', 'Exo', 'Share Tech Mono', 'Impact (system)', 'system-ui (system)', 'Consolas (system)']);
const SYSTEM_STRIP = v => v.replace(/\s*\(system\)$/i, '').trim();
const DEFAULT_FONTS = Object.freeze({ display: 'Jujutsu Kaisen', sans: 'Noto Sans JP', mono: 'JetBrains Mono' });
const FONT_WEIGHTS = Object.freeze({ display: '400', sans: '500;700;900', mono: '500;700' });
const FONT_FAMILIES = Object.freeze({
  display: '--jk-display',
  sans: '--jk-sans',
  mono: '--jk-mono',
});
const googleFontsLoaded = new Set();
const googleFontsLinks = new Map(); // family -> <link> element inserted

function ensureGoogleFont(rawFamily) {
  const family = String(rawFamily || '').trim();
  if (!family) return;
  if (LOCAL_FONTS.has(family)) return;
  if (googleFontsLoaded.has(family)) return;
  const encoded = family.split(',').map(s => s.trim()).filter(Boolean).map(s => s.replace(/\s+/g, '+')).join('|');
  if (!encoded) return;
  googleFontsLoaded.add(family);
  const existing = document.querySelector(`link[data-google-fonts-hash="${encoded}"]`);
  if (existing) return;
  const pre = document.createElement('link');
  pre.rel = 'preconnect';
  pre.href = 'https://fonts.googleapis.com';
  pre.crossOrigin = 'anonymous';
  document.head.appendChild(pre);
  const pre2 = document.createElement('link');
  pre2.rel = 'preconnect';
  pre2.href = 'https://fonts.gstatic.com';
  pre2.crossOrigin = 'anonymous';
  document.head.appendChild(pre2);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.dataset.googleFontsHash = encoded;
  link.href = `https://fonts.googleapis.com/css2?family=${encoded}&display=swap`;
  googleFontsLinks.set(family, link);
  document.head.appendChild(link);
}
let appliedFonts = Object.assign({}, DEFAULT_FONTS);
function applyFont(slot, rawFamily) {
  const varName = FONT_FAMILIES[slot];
  if (!varName) return;
  let family = String(rawFamily || '').trim();
  if (!family) family = DEFAULT_FONTS[slot];
  appliedFonts[slot] = family;
  const cleanFamily = SYSTEM_STRIP(family);
  if (!LOCAL_FONTS.has(family)) ensureGoogleFont(cleanFamily);
  const withFallback = LOCAL_FONTS.has(family)
    ? `'${cleanFamily}', ${fallbackFor(slot)}`
    : `'${cleanFamily}', ${fallbackFor(slot)}`;
  FONT_ROOTS.style.setProperty(varName, withFallback);
}
function fallbackFor(slot) {
  if (slot === 'display') return "'Anton','Archivo Black',Impact,sans-serif";
  if (slot === 'mono') return "'JetBrains Mono','Share Tech Mono',Consolas,monospace";
  return "'Noto Sans JP','Exo',system-ui,sans-serif";
}
applyFont('display', DEFAULT_FONTS.display);
applyFont('sans', DEFAULT_FONTS.sans);
applyFont('mono', DEFAULT_FONTS.mono);
const root = document.querySelector('.timer');
const headingText = root && root.querySelector('h1');
const switchButton = document.querySelector('.day-switch');
const grid = document.querySelector('.tiles');
const cards = Object.fromEntries([...document.querySelectorAll('[data-unit]')].map(card => [card.dataset.unit, card]));
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let showDays = false;
let lastValues = {};

const audio = document.getElementById('bg-audio');
const soundPill = document.getElementById('sound-pill');
let soundOn = false;
let soundVolume = 0.6;
let wantsAutoplay = false;

function syncSoundPill() {
  if (!soundPill) return;
  const actuallyPlaying = soundOn && soundVolume > 0 && audio && !audio.paused && !audio.muted;
  const label = soundPill.querySelector('.sound-label');
  soundPill.classList.toggle('is-on', actuallyPlaying);
  soundPill.setAttribute('aria-pressed', String(actuallyPlaying));
  if (label) label.textContent = actuallyPlaying ? 'MUTE' : 'SOUND';
}

(function bootstrapAudio() {
  if (!audio) return;
  const muteMedia = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (muteMedia) {
    audio.volume = 0;
    soundVolume = 0;
  } else {
    audio.volume = soundVolume;
  }
  ['play', 'pause', 'volumechange'].forEach(evt => audio.addEventListener(evt, syncSoundPill));
  syncSoundPill();
})();

if (soundPill) soundPill.addEventListener('click', () => setSoundOn(!soundOn, 'pill'));

function applyAudioState(forcePlay) {
  if (!audio) return;
  try { audio.volume = Number.isFinite(soundVolume) ? soundVolume : 0.6; } catch (_) {}
  if (!soundOn) {
    try { audio.pause(); } catch (_) {}
    syncSoundPill();
    return;
  }
  if (forcePlay || wantsAutoplay) {
    const attempt = audio.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => { wantsAutoplay = true; syncSoundPill(); });
      if (typeof attempt.then === 'function') attempt.then(syncSoundPill);
    } else {
      syncSoundPill();
    }
  } else {
    syncSoundPill();
  }
}
(function attachAutoplayRecovery() {
  function onFirstInteraction() {
    if (!wantsAutoplay || !soundOn) return;
    wantsAutoplay = false;
    applyAudioState(true);
    removeEventListener('pointerdown', onFirstInteraction, { once: true });
    removeEventListener('keydown', onFirstInteraction, { once: true });
    removeEventListener('touchstart', onFirstInteraction, { once: true });
  }
  addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true });
  addEventListener('keydown', onFirstInteraction, { once: true, passive: true });
  addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
})();

function isoParts(ms) {
  const d = new Date(ms);
  const pad = n => String(n).padStart(2, '0');
  return {
    iso: d.toISOString(),
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
  };
}

(function setDefaultDeadline() {
  const attr = grid && (grid.getAttribute('count-down-date') || grid.dataset.deadline);
  const existing = attr && Date.parse(attr);
  if (!grid) return;
  if (!Number.isFinite(existing) || existing <= Date.now()) {
    const p = isoParts(Date.now() + 7 * 86400 * 1000);
    grid.setAttribute('count-down-date', p.iso);
  }
})();

(function restoreSavedConfig() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) { saved = null; }
  if (!saved || typeof saved !== 'object') return;
  if (typeof saved.heading === 'string' && headingText) headingText.textContent = saved.heading;
  if (typeof saved.deadline === 'string' && Number.isFinite(Date.parse(saved.deadline))) {
    grid.setAttribute('count-down-date', saved.deadline);
  }
  if (saved.doubleDigit === 0 || saved.doubleDigit === 1) {
    grid.setAttribute('double-digit-format', String(saved.doubleDigit));
  }
  if (typeof saved.showDays === 'boolean') showDays = saved.showDays;
  if (typeof saved.soundOn === 'boolean') soundOn = saved.soundOn;
  if (typeof saved.soundVolume === 'number' && saved.soundVolume >= 0 && saved.soundVolume <= 1) {
    soundVolume = saved.soundVolume;
  }
  if (typeof saved.fontDisplay === 'string') applyFont('display', saved.fontDisplay);
  if (typeof saved.fontSans === 'string') applyFont('sans', saved.fontSans);
  if (typeof saved.fontMono === 'string') applyFont('mono', saved.fontMono);
  if (soundOn) wantsAutoplay = true;
  applyAudioState(false);
})();

function setShowDays(next, source) {
  showDays = !!next;
  root.classList.toggle('show-days', showDays);
  switchButton.setAttribute('aria-checked', String(showDays));
  if (cards.days) cards.days.setAttribute('aria-hidden', String(!showDays));
  const cfgDays = document.getElementById('cfg-days');
  if (cfgDays && source !== 'cfg') {
    cfgDays.setAttribute('aria-checked', String(showDays));
    cfgDays.classList.toggle('is-on', showDays);
  }
  tick();
}

function setDoubleDigit(next, source) {
  const value = next ? '1' : '0';
  grid.setAttribute('double-digit-format', value);
  lastValues = {};
  const cfgDouble = document.getElementById('cfg-double');
  if (cfgDouble && source !== 'cfg') {
    cfgDouble.setAttribute('aria-checked', String(next));
    cfgDouble.classList.toggle('is-on', !!next);
  }
  tick();
}

function setSoundOn(next, source) {
  soundOn = !!next;
  wantsAutoplay = soundOn;
  const cfgSound = document.getElementById('cfg-sound');
  if (cfgSound && source !== 'cfg') {
    cfgSound.setAttribute('aria-checked', String(soundOn));
    cfgSound.classList.toggle('is-on', soundOn);
  }
  applyAudioState(true);
}
function setSoundVolume(value) {
  const v = Math.min(1, Math.max(0, Number(value) || 0));
  soundVolume = v;
  if (audio) {
    try { audio.volume = v; } catch (_) {}
  }
  const cfgVolume = document.getElementById('cfg-volume');
  if (cfgVolume && Math.abs(Number(cfgVolume.value) - v) > 0.001) cfgVolume.value = String(v);
  syncSoundPill();
}

function setDeadlineFromParts(dateStr, timeStr) {
  if (!dateStr && !timeStr) return;
  const current = isoParts(Date.parse(grid.getAttribute('count-down-date')) || Date.now());
  const iso = new Date(`${dateStr || current.date}T${timeStr || current.time}Z`);
  const ms = iso.getTime();
  if (!Number.isFinite(ms)) return;
  grid.setAttribute('count-down-date', new Date(ms).toISOString());
  lastValues = {};
  tick();
}

function updateNumber(unit, value, animate) {
  const slot = cards[unit].querySelector('.number');
  const text = grid.getAttribute('double-digit-format') === '0' ? String(value) : String(value).padStart(2, '0');
  if (lastValues[unit] === text) return;
  if (!animate || lastValues[unit] === undefined || motionPreference.matches) {
    slot.textContent = text;
  } else {
    const reel = document.createElement('div');
    reel.className = 'digit-reel';
    for (const label of [lastValues[unit], text]) {
      const row = document.createElement('div');
      row.className = 'digit-row';
      row.textContent = label;
      reel.append(row);
    }
    slot.replaceChildren(reel);
    reel.addEventListener('animationend', () => {
      if (slot.firstChild === reel) slot.textContent = text;
    }, { once: true });
  }
  lastValues[unit] = text;
}

function tick(animate = true) {
  const deadline = Date.parse(grid.getAttribute('count-down-date') || grid.dataset.deadline);
  const total = Number.isFinite(deadline) ? Math.max(0, Math.floor((deadline - Date.now()) / 1000)) : 0;
  updateNumber('days', Math.floor(total / 86400), animate);
  updateNumber('hours', showDays ? Math.floor(total / 3600) % 24 : Math.floor(total / 3600), animate);
  updateNumber('minutes', Math.floor(total / 60) % 60, animate);
  updateNumber('seconds', total % 60, animate);
}
switchButton.addEventListener('click', () => setShowDays(!showDays, 'header'));
setShowDays(false, 'init');
setDoubleDigit(grid.getAttribute('double-digit-format') !== '0', 'init');
tick(false);
setInterval(tick, 1000);

// Desktop scroll choreography: the four tiles pass through three poses.
const basePoses = {
  hours: [[0, 0, 0], [0, 100, 180], [-100, 200, 360]],
  days: [[0, 0, 0], [100, 200, -90], [200, 100, 0]],
  minutes: [[0, 0, 0], [0, -100, -180], [-100, 0, -360]],
  seconds: [[0, 0, 0], [100, -100, 270], [0, -200, 360]],
};
function scalePoses(scale) {
  const out = {};
  for (const [unit, stops] of Object.entries(basePoses)) {
    out[unit] = stops.map(triplet => [triplet[0] * scale, triplet[1] * scale, triplet[2]]);
  }
  return out;
}
const stage = document.querySelector('.scroll-stage');
const cue = document.querySelector('.scroll-cue');
const clamp = value => Math.min(1, Math.max(0, value));
const desktop = matchMedia('(min-width: 992px)');
const coarsePointer = matchMedia('(pointer: coarse)');
const tinyViewport = matchMedia('(max-width: 479px)');
let poses = desktop.matches ? scalePoses(1) : scalePoses(tinyViewport.matches ? 0.5 : coarsePointer.matches ? 0.58 : 0.72);
function easeOutBack(value) {
  const t = value - 1;
  return 1 + t * t * (2.70158 * t + 1.70158);
}
function refreshPoseScale() {
  poses = desktop.matches ? scalePoses(1) : scalePoses(tinyViewport.matches ? 0.5 : coarsePointer.matches ? 0.58 : 0.72);
}
desktop.addEventListener('change', () => { refreshPoseScale(); syncScroll(); });
coarsePointer.addEventListener('change', () => { refreshPoseScale(); syncScroll(); });
tinyViewport.addEventListener('change', () => { refreshPoseScale(); syncScroll(); });

// Collision sparks: emit long blade-streaks ONLY at the instant two tiles first intersect.
const sparksLayer = document.querySelector('.sparks-layer');
const tileUnits = ['days', 'hours', 'minutes', 'seconds'];
const BASE_MAX_SPARKS = 72;
let MAX_SPARKS = BASE_MAX_SPARKS;
function refreshSparkCap() {
  MAX_SPARKS = BASE_MAX_SPARKS * (tinyViewport.matches ? 0.55 : coarsePointer.matches ? 0.7 : 1) | 0;
}
refreshSparkCap();
desktop.addEventListener('change', refreshSparkCap);
coarsePointer.addEventListener('change', refreshSparkCap);
tinyViewport.addEventListener('change', refreshSparkCap);
const MIN_IMPACT_PX = coarsePointer.matches ? 8 : 12;
const activeSparks = [];
const sparkPool = [];
const prevTileBoxes = Object.create(null);
const prevTouchingPairs = new Set();
function pairKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }
function acquireSparkNode() {
  if (sparkPool.length) return sparkPool.pop();
  const node = document.createElement('div');
  node.className = 'spark';
  return node;
}
function releaseSpark(s) {
  if (!s || !s.node) return;
  s.node.remove();
  sparkPool.push(s.node);
  s.node = null;
}
function emitBladeStreaks(contactPoints, contactNormalX, contactNormalY, count, impactSpeed, tileBoxA, tileBoxB) {
  if (!sparksLayer || !contactPoints.length) return;
  const layerBox = sparksLayer.getBoundingClientRect();
  const normalSign = Math.random() < 0.5 ? -1 : 1;
  const tangentX = -contactNormalY * normalSign;
  const tangentY = contactNormalX * normalSign;
  const velA = tileBoxA ? Math.hypot(tileBoxA.vx || 0, tileBoxA.vy || 0) : 0;
  const velB = tileBoxB ? Math.hypot(tileBoxB.vx || 0, tileBoxB.vy || 0) : 0;
  const impulse = Math.min(1, impactSpeed / 260) * 0.75 + 0.25;
  const perPoint = Math.ceil(count / contactPoints.length);
  let spawned = 0;
  const slots = Math.min(count, MAX_SPARKS - activeSparks.length);
  for (let p = 0; p < contactPoints.length && spawned < slots; p++) {
    const pt = contactPoints[p];
    const baseX = pt.x - layerBox.left;
    const baseY = pt.y - layerBox.top;
    for (let i = 0; i < perPoint && spawned < slots; i++) {
      const fan = (Math.random() - 0.5) * 0.28;
      const cs = Math.cos(fan), sn = Math.sin(fan);
      const dirX = tangentX * cs - tangentY * sn;
      const dirY = tangentX * sn + tangentY * cs;
      const dirLen = Math.hypot(dirX, dirY) || 1;
      const baseSpeed = 540 + Math.random() * 460;
      const speed = baseSpeed * (0.6 + impulse * 1.2);
      const streakLen = (36 + Math.random() * 124) * (0.5 + impulse * 1.3);
      const jitterX = (Math.random() - 0.5) * 3.2;
      const jitterY = (Math.random() - 0.5) * 3.2;
      const palette = Math.random();
      const color = palette < .72 ? 'spark-hot' : palette < .94 ? 'spark-paper' : 'spark-red';
      const node = acquireSparkNode();
      node.className = `spark ${color}`;
      sparksLayer.appendChild(node);
      activeSparks.push({
        node,
        x: baseX + jitterX,
        y: baseY + jitterY,
        vx: dirX / dirLen * speed,
        vy: dirY / dirLen * speed,
        life: 1,
        decay: 4.2 + Math.random() * 5.2,
        drag: 0.962 + Math.random() * 0.024,
        rot: Math.atan2(dirY, dirX) * 180 / Math.PI,
        baseScale: streakLen,
        gravity: 55 + Math.random() * 95,
        impulse,
      });
      spawned++;
    }
  }
  while (activeSparks.length > MAX_SPARKS) releaseSpark(activeSparks.shift());
}
function integrateSparks(deltaS) {
  if (!activeSparks.length) return;
  for (let i = activeSparks.length - 1; i >= 0; i--) {
    const s = activeSparks[i];
    s.vx *= Math.pow(s.drag, deltaS * 60);
    s.vy *= Math.pow(s.drag, deltaS * 60);
    s.vy += s.gravity * deltaS * (0.4 + (1 - s.impulse) * 0.4);
    s.x += s.vx * deltaS;
    s.y += s.vy * deltaS;
    s.life -= s.decay * deltaS;
    if (s.life <= 0) {
      releaseSpark(s);
      activeSparks.splice(i, 1);
      continue;
    }
    const fade = Math.min(1, s.life * 1.25);
    const speedMag = Math.hypot(s.vx, s.vy);
    const streakScale = s.baseScale * (0.28 + Math.min(2.2, speedMag / 780) * 0.9) * (0.55 + fade * 0.45);
    s.node.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.rot}deg) scaleX(${streakScale})`;
    s.node.style.opacity = String(fade);
  }
}
function cullAllSparks() {
  for (let i = activeSparks.length - 1; i >= 0; i--) releaseSpark(activeSparks[i]);
  activeSparks.length = 0;
  prevTouchingPairs.clear();
}
function rectsOverlapAndNormal(a, b) {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right <= left || bottom <= top) return null;
  const w = right - left;
  const h = bottom - top;
  let nx = 0, ny = 0;
  const penX = a.right <= b.left ? 0 : (a.right < b.right ? -1 : 1);
  const penY = a.bottom <= b.top ? 0 : (a.bottom < b.bottom ? -1 : 1);
  if (w <= h) {
    nx = penX || (a.left + a.right < b.left + b.right ? -1 : 1);
    ny = 0;
  } else {
    ny = penY || (a.top + a.bottom < b.top + b.bottom ? -1 : 1);
    nx = 0;
  }
  return { area: w * h, w, h, left, right, top, bottom, nx, ny };
}
function measureTileBoxes() {
  const boxes = Object.create(null);
  for (const unit of tileUnits) {
    const el = cards[unit];
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const prev = prevTileBoxes[unit];
    boxes[unit] = {
      left: r.left, right: r.right, top: r.top, bottom: r.bottom,
      vx: prev ? ((r.left + r.right) - (prev.left + prev.right)) / 2 : 0,
      vy: prev ? ((r.top + r.bottom) - (prev.top + prev.bottom)) / 2 : 0,
    };
    prevTileBoxes[unit] = boxes[unit];
  }
  return boxes;
}

// Mobile gesture: tap anywhere on tiles to "clang" them — a one-shot pose sweep from 0→1→0 with fast easing, guaranteed to collide all tiles in the middle.
let clangRunning = false;

// Onboarding hint banner (dismissed on first clang, once per session)
(function addClangHint() {
  if (!coarsePointer.matches || !grid) return;
  try {
    if (sessionStorage.getItem('cubecount:clang-hint') === '1') return;
  } catch (_) {}
  const hint = document.createElement('div');
  hint.className = 'clang-hint';
  hint.setAttribute('role', 'note');
  hint.setAttribute('aria-live', 'polite');
  hint.textContent = 'Tap tiles to clang';
  Object.assign(hint.style, {
    position: 'fixed', left: '50%', bottom: '4.2em', transform: 'translateX(-50%)',
    padding: '.55em 1em', fontSize: '1.1em', letterSpacing: '.04em',
    textTransform: 'uppercase', fontWeight: '600', color: 'var(--paper, #fbfbf9)',
    background: 'rgba(38, 38, 38, .85)', border: '1px solid rgba(217, 38, 38, .5)',
    borderRadius: '999px', pointerEvents: 'none', zIndex: '5',
    opacity: '0', transition: 'opacity .4s ease-out .8s',
    boxShadow: '0 6px 22px rgba(0,0,0,.35)',
    fontFamily: 'Exo, sans-serif',
  });
  document.body.appendChild(hint);
  requestAnimationFrame(() => { hint.style.opacity = '1'; });
  function clearHint() {
    try { sessionStorage.setItem('cubecount:clang-hint', '1'); } catch (_) {}
    hint.style.opacity = '0';
    hint.style.transition = 'opacity .25s ease-out';
    setTimeout(() => hint.remove(), 320);
    removeEventListener('scroll', onFirstScroll, { passive: true });
  }
  function onFirstScroll() { if (window.scrollY > 60) clearHint(); }
  addEventListener('scroll', onFirstScroll, { passive: true, once: true });
  addEventListener('clang:fired', clearHint, { once: true });
  setTimeout(clearHint, 9000);
})();

function triggerClang() {
  if (clangRunning) return;
  if (motionPreference.matches) return;
  clangRunning = true;
  dispatchEvent(new Event('clang:fired'));
  const sweep = { t: 0, stage: 0 }; // stage 0 = go forward, 1 = go back
  const durationFwd = tinyViewport.matches ? 560 : coarsePointer.matches ? 620 : 720;
  const durationBack = tinyViewport.matches ? 700 : coarsePointer.matches ? 780 : 900;
  const started = performance.now();
  function runSweep(now) {
    const elapsed = now - started;
    if (sweep.stage === 0) {
      if (elapsed < durationFwd) {
        const tt = easeOutBack(elapsed / durationFwd);
        progress = clamp(tt);
        target = progress;
        if (!frame) frame = requestAnimationFrame(renderScroll);
      } else {
        progress = 1;
        target = 1;
        sweep.stage = 1;
      }
    } else {
      const e2 = elapsed - durationFwd;
      if (e2 < durationBack) {
        const tt = easeOutBack(e2 / durationBack);
        progress = clamp(1 - tt);
        target = progress;
        if (!frame) frame = requestAnimationFrame(renderScroll);
      } else {
        progress = 0;
        target = 0;
        clangRunning = false;
        return;
      }
    }
    requestAnimationFrame(runSweep);
  }
  requestAnimationFrame(runSweep);
  if (coarsePointer.matches && 'vibrate' in navigator) {
    try { navigator.vibrate([8, 24, 8]); } catch (_) {}
  }
}
if (grid) {
  let clangTimer = 0;
  const gestureThresholdMs = 220;
  grid.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' && !coarsePointer.matches) return;
    if (!grid.contains(e.target)) return;
    if (e.target.closest('button,input,select,textarea')) return;
    clearTimeout(clangTimer);
    clangTimer = setTimeout(triggerClang, gestureThresholdMs);
  }, { passive: true });
  grid.addEventListener('pointerup', () => clearTimeout(clangTimer), { passive: true });
  grid.addEventListener('pointercancel', () => clearTimeout(clangTimer), { passive: true });
  grid.addEventListener('click', e => {
    if (!coarsePointer.matches) return;
    if (e.target.closest('button,input,select,textarea,a')) return;
    triggerClang();
  });
}

let progress = 0;
let target = 0;
let frame = 0;
let lastFrame = 0;
function renderScroll(now) {
  const delta = lastFrame ? Math.min(64, now - lastFrame) : 16.667;
  lastFrame = now;
  const deltaS = delta / 1000;
  progress += (target - progress) * (1 - Math.pow(.95, delta / 16.667));
  if (Math.abs(target - progress) < .00001) progress = target;
  const segment = progress < .5 ? 0 : 1;
  const amount = easeOutBack(clamp((progress - segment * .5) * 2));
  for (const [unit, stops] of Object.entries(poses)) {
    const values = stops[segment].map((n, axis) => n + (stops[segment + 1][axis] - n) * amount);
    cards[unit].style.transform = `translate(${values[0]}%, ${values[1]}%) rotate(${values[2]}deg)`;
  }
  // Blade-collision streaks: ONLY emit on the FIRST frame a pair intersects, with meaningful impact speed.
  if (sparksLayer) {
    const boxes = measureTileBoxes();
    const list = tileUnits.filter(u => u !== 'days' || showDays);
    const nowTouching = new Set();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = boxes[list[i]]; const b = boxes[list[j]];
        if (!a || !b) continue;
        const key = pairKey(list[i], list[j]);
        const hit = rectsOverlapAndNormal(a, b);
        if (!hit) continue;
        nowTouching.add(key);
        if (prevTouchingPairs.has(key)) continue;
        const impactSpeed = Math.hypot((a.vx || 0) - (b.vx || 0), (a.vy || 0) - (b.vy || 0));
        if (impactSpeed < MIN_IMPACT_PX) continue;
        const sizeFactor = Math.min(1, hit.area / 9000);
        const count = Math.max(8, Math.round((10 + sizeFactor * 30) * (0.45 + Math.min(1.2, impactSpeed / 180) * 0.8)));
        // Sample 3–6 contact points evenly along the thin (penetration) axis so streaks line the whole collision edge.
        const thinAlongX = hit.w <= hit.h;
        const pointsAlong = Math.min(6, Math.max(3, Math.round(4 + sizeFactor * 2)));
        const pts = [];
        for (let p = 0; p < pointsAlong; p++) {
          const t = pointsAlong === 1 ? 0.5 : p / (pointsAlong - 1);
          const px = thinAlongX ? (hit.left + hit.w / 2) : (hit.left + hit.w * t);
          const py = thinAlongX ? (hit.top + hit.h * t) : (hit.top + hit.h / 2);
          pts.push({ x: px, y: py });
        }
        emitBladeStreaks(pts, hit.nx || 0, hit.ny || 0, count, impactSpeed, a, b);
        if (coarsePointer.matches && 'vibrate' in navigator) {
          try {
            const intensity = Math.min(1, impactSpeed / 320);
            const buzz = Math.round(10 + intensity * 32);
            navigator.vibrate([Math.round(4 + intensity * 6), buzz, Math.round(4 + intensity * 4)]);
          } catch (_) {}
        }
      }
    }
    prevTouchingPairs.clear();
    for (const k of nowTouching) prevTouchingPairs.add(k);
  }
  integrateSparks(deltaS);
  cue.style.opacity = String(1 - clamp(progress / .1));
  if (progress !== target) frame = requestAnimationFrame(renderScroll);
  else { frame = 0; lastFrame = 0; }
}
function syncScroll() {
  if (motionPreference.matches) {
    cancelAnimationFrame(frame);
    frame = 0; lastFrame = 0; progress = 0; target = 0;
    for (const card of Object.values(cards)) card.style.transform = '';
    cue.style.opacity = desktop.matches ? '1' : '0';
    for (const k of Object.keys(prevTileBoxes)) delete prevTileBoxes[k];
    cullAllSparks();
    return;
  }
  target = clamp(-stage.getBoundingClientRect().top / (stage.offsetHeight * (desktop.matches ? 0.67 : 0.82)));
  if (!frame) frame = requestAnimationFrame(renderScroll);
}
addEventListener('scroll', syncScroll, { passive: true });
addEventListener('resize', syncScroll);
motionPreference.addEventListener('change', syncScroll);
syncScroll();

// Configurable countdown panel: populate live state on open, live-wire all controls.
const opener = document.querySelector('.help-trigger');
const backdrop = document.querySelector('.modal-backdrop');
const dialog = document.querySelector('.help-dialog');
const closeButtons = document.querySelectorAll('.close-help');
let closingTimeout;
let modalOpen = false;

const cfgHeading = document.getElementById('cfg-heading');
const cfgDate = document.getElementById('cfg-date');
const cfgTime = document.getElementById('cfg-time');
const cfgSound = document.getElementById('cfg-sound');
const cfgVolume = document.getElementById('cfg-volume');
const cfgDouble = document.getElementById('cfg-double');
const cfgDays = document.getElementById('cfg-days');
const cfgFontDisplay = document.getElementById('cfg-font-display');
const cfgFontDisplayCustom = document.getElementById('cfg-font-display-custom');
const cfgFontSans = document.getElementById('cfg-font-sans');
const cfgFontSansCustom = document.getElementById('cfg-font-sans-custom');
const cfgFontMono = document.getElementById('cfg-font-mono');
const cfgFontMonoCustom = document.getElementById('cfg-font-mono-custom');

function populateConfig() {
  if (cfgHeading && headingText) cfgHeading.value = headingText.textContent;
  const current = isoParts(Date.parse(grid.getAttribute('count-down-date')) || Date.now());
  if (cfgDate) cfgDate.value = current.date;
  if (cfgTime) cfgTime.value = current.time;
  if (cfgSound) {
    cfgSound.setAttribute('aria-checked', String(soundOn));
    cfgSound.classList.toggle('is-on', !!soundOn);
  }
  if (cfgVolume) cfgVolume.value = String(Number.isFinite(soundVolume) ? soundVolume : 0.6);
  if (cfgDouble) {
    const on = grid.getAttribute('double-digit-format') !== '0';
    cfgDouble.setAttribute('aria-checked', String(on));
    cfgDouble.classList.toggle('is-on', on);
  }
  if (cfgDays) {
    cfgDays.setAttribute('aria-checked', String(showDays));
    cfgDays.classList.toggle('is-on', showDays);
  }
  setFontInputs(cfgFontDisplay, cfgFontDisplayCustom, appliedFonts.display, DEFAULT_FONTS.display);
  setFontInputs(cfgFontSans, cfgFontSansCustom, appliedFonts.sans, DEFAULT_FONTS.sans);
  setFontInputs(cfgFontMono, cfgFontMonoCustom, appliedFonts.mono, DEFAULT_FONTS.mono);
}
function setFontInputs(sel, custom, applied, def) {
  if (!sel) return;
  const preset = [...sel.options].some(o => o.value && o.value !== '__custom__' && o.value === applied);
  if (preset) {
    sel.value = applied;
    if (custom) { custom.hidden = true; custom.value = ''; }
  } else {
    sel.value = '__custom__';
    if (custom) { custom.hidden = false; custom.value = applied; }
  }
}
function resolveFontFromInputs(sel, custom, def) {
  if (!sel) return def;
  if (sel.value === '__custom__') {
    const v = (custom && custom.value || '').trim();
    return v || def;
  }
  return sel.value || def;
}
function bindFontInputs(slot, sel, custom, def) {
  if (!sel) return;
  const apply = () => {
    const v = resolveFontFromInputs(sel, custom, def);
    applyFont(slot, v);
  };
  sel.addEventListener('change', () => {
    const isCustom = sel.value === '__custom__';
    if (custom) custom.hidden = !isCustom;
    if (!isCustom) apply();
    else apply();
  });
  if (custom) custom.addEventListener('input', apply);
}
bindFontInputs('display', cfgFontDisplay, cfgFontDisplayCustom, DEFAULT_FONTS.display);
bindFontInputs('sans', cfgFontSans, cfgFontSansCustom, DEFAULT_FONTS.sans);
bindFontInputs('mono', cfgFontMono, cfgFontMonoCustom, DEFAULT_FONTS.mono);

if (cfgHeading) cfgHeading.addEventListener('input', e => {
  if (headingText) headingText.textContent = e.target.value || '';
});
if (cfgDate) cfgDate.addEventListener('input', e => setDeadlineFromParts(e.target.value, cfgTime && cfgTime.value));
if (cfgTime) cfgTime.addEventListener('input', e => setDeadlineFromParts(cfgDate && cfgDate.value, e.target.value));
if (cfgSound) cfgSound.addEventListener('click', () => {
  const next = cfgSound.getAttribute('aria-checked') !== 'true';
  cfgSound.setAttribute('aria-checked', String(next));
  cfgSound.classList.toggle('is-on', next);
  setSoundOn(next, 'cfg');
});
if (cfgVolume) cfgVolume.addEventListener('input', e => setSoundVolume(Number(e.target.value)));
if (cfgDouble) cfgDouble.addEventListener('click', () => {
  const next = cfgDouble.getAttribute('aria-checked') !== 'true';
  cfgDouble.setAttribute('aria-checked', String(next));
  cfgDouble.classList.toggle('is-on', next);
  setDoubleDigit(next, 'cfg');
});
if (cfgDays) cfgDays.addEventListener('click', () => {
  const next = cfgDays.getAttribute('aria-checked') !== 'true';
  cfgDays.setAttribute('aria-checked', String(next));
  cfgDays.classList.toggle('is-on', next);
  setShowDays(next, 'cfg');
});
document.querySelectorAll('.presets button[data-offset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const offset = Number(btn.dataset.offset) || 0;
    const p = isoParts(Date.now() + offset * 1000);
    if (cfgDate) cfgDate.value = p.date;
    if (cfgTime) cfgTime.value = p.time;
    grid.setAttribute('count-down-date', p.iso);
    lastValues = {};
    tick();
  });
});

const saveButton = document.getElementById('save-config');
const saveStatus = document.getElementById('save-status');
let saveStatusTimeout;
function showSaveStatus(message, tone) {
  if (!saveStatus) return;
  clearTimeout(saveStatusTimeout);
  saveStatus.textContent = message;
  saveStatus.hidden = false;
  saveStatus.className = `save-status is-${tone || 'ok'}`;
  saveStatusTimeout = setTimeout(() => {
    saveStatus.hidden = true;
  }, 2400);
}
if (saveButton) saveButton.addEventListener('click', () => {
  try {
    const deadline = grid.getAttribute('count-down-date') || '';
    const payload = {
      heading: headingText ? headingText.textContent : '',
      deadline: Number.isFinite(Date.parse(deadline)) ? deadline : '',
      doubleDigit: grid.getAttribute('double-digit-format') === '0' ? 0 : 1,
      showDays: !!showDays,
      soundOn: !!soundOn,
      soundVolume: Number.isFinite(soundVolume) ? soundVolume : 0.6,
      fontDisplay: resolveFontFromInputs(cfgFontDisplay, cfgFontDisplayCustom, DEFAULT_FONTS.display),
      fontSans: resolveFontFromInputs(cfgFontSans, cfgFontSansCustom, DEFAULT_FONTS.sans),
      fontMono: resolveFontFromInputs(cfgFontMono, cfgFontMonoCustom, DEFAULT_FONTS.mono),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    showSaveStatus('Saved to this device', 'ok');
  } catch (err) {
    showSaveStatus('Save failed — storage disabled', 'err');
  }
});

function openHelp() {
  clearTimeout(closingTimeout);
  modalOpen = true;
  populateConfig();
  backdrop.hidden = false;
  backdrop.getBoundingClientRect();
  backdrop.classList.add('is-open');
  dialog.focus({ preventScroll: true });
}
function closeHelp() {
  modalOpen = false;
  backdrop.classList.remove('is-open');
  closingTimeout = setTimeout(() => {
    backdrop.hidden = true;
    opener.focus({ preventScroll: true });
  }, motionPreference.matches ? 0 : 700);
}
opener.addEventListener('click', openHelp);
closeButtons.forEach(btn => btn.addEventListener('click', closeHelp));
document.addEventListener('keydown', event => {
  if (!modalOpen) return;
  if (event.key === 'Escape') { event.preventDefault(); closeHelp(); }
  if (event.key === 'Tab') {
    const items = [...dialog.querySelectorAll('a,button,input,fieldset button,[role="switch"]')].filter(el => !el.hasAttribute('disabled') && el.getAttribute('type') !== 'hidden');
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && [first, dialog].includes(document.activeElement)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
});
