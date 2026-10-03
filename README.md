
> *The seal opens when the timer hits zero.*
>
> A **Jujutsu Kaisen Prison Realm-inspired** sliding cube countdown , zero dependencies, drop-in via HTML attributes, blade-clash friction sparks, animated digit reels, and a full responsive clang-gesture UX for phones.

<p align="center">
  <img
    src="assets/jjk.gif"
    alt="Prison Cube in motion four sliding digit cubes collide and erupt with blade-clash sparks, just like the Jujutsu Kaisen Prison Realm cube seal."
    width="640"
    style="border-radius: 10px; box-shadow: 0 16px 48px #00000080; border: 1px solid #0000001a;"
  >
</p>

<p align="center">
  <a href="#-quick-start">Quick start</a> · <a href="#-html-attribute-api">API</a> · <a href="#-configure-panel">Configure</a> · <a href="#-interaction-map">Interaction map</a>
</p>

<br>

## ✨ Features

- **🗝️ Zero build step, zero dependencies.** No npm. No bundler. Works from `file://` even offline.
- **🧊 4 sliding digit cubes** (seconds / minutes / hours / days) with an orchestrated 3-keyframe scroll choreography.
- **⚔️ Blade-clash collision sparks** , long friction streaks erupt *only* the instant two cubes intersect (not continuously), scaled by impact velocity.
- **🎞️ Digit reel slide animation** , every countdown tick creates a transient digit-reel DOM node that animates downward via keyframes, then auto-cleans itself up on `animationend`.
- **📱 Fully mobile-optimized.**
  - Grid reflow: wide days/seconds rows flanking side-by-side hours/minutes
  - **Tap-to-clang gesture** anywhere on the tiles → one-shot full pose sweep (progress 0 → 1 → 0 with `easeOutBack`) guaranteed to collide all 4 pairs
  - Android **haptic buzzes** scaled per-collision impact
  - Onboarding tooltip "Tap tiles to clang" pill (once per session)
  - Subtle iOS swipe-up hint at the bottom + `.tiles:active .tile` press-down feedback
- **🎛️ Full Configure panel**
  - Heading, target date, target time (UTC)
  - Sound toggle, volume slider, save state to localStorage
  - Double-digit format (08 vs 8) + Show days toggle , bidirectionally synced with header
  - **Font switching** , 9 curated presets per slot (Display / UI sans / Numbers mono) + raw Google Font name free-text auto-loader
  - Quick presets: 15 min / 1 hour / 1 day / 1 week
- **🔊 Audio support** with a mobile mute-toggle corner pill, autoplay-policy recovery (re-tries on first user gesture anywhere), and `prefers-reduced-motion` global mute.
- **♿ Accessibility first.**
  - `prefers-reduced-motion` honored in **both** CSS (zeroes out all durations) **and** JS (skips digit reels, disables scroll choreography + clang gesture + sparks)
  - Keyboard-focus-trapped modal with Escape close + focus restoration back to Configure button
  - ARIA `role="switch"`, `role="dialog"` `aria-modal`, `aria-checked`, `aria-pressed` throughout
  - Tab-index focus rings everywhere in red-visible 2px outline

---

## 🚀 Quick start

Three ways to use it , **pick the easiest one**:

### Option 1: Drop-in static page (recommended)

```bash
git clone https://github.com/peterultimate/prison-cube-countdown
cd prison-cube-countdown
# open index.html in any browser
```

That's it. No setup, no server. Open the file, Configure the deadline in 2 clicks, Save to device.

### Option 2: Serve via any static server

```bash
# python 3
python3 -m http.server 8080
# OR node
npx --yes serve .
```

### Option 3: Embed in your own HTML

```html
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Noto+Sans+JP:wght@500;700;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="prison-cube-countdown/style.css">
<script src="prison-cube-countdown/timer.js" defer></script>

<!-- then somewhere in your body -->
<main class="scroll-stage">
  <div class="sticky-stage">
    <div class="scene">
      <section class="timer" aria-label="Countdown">
        <div class="scroll-cue" aria-hidden="true"><span></span></div>
        <header class="timer-heading">
          <h1>Launch drops in</h1>
          <button class="day-switch" type="button" role="switch" aria-checked="false" aria-label="Show days"><span></span></button>
        </header>
        <div class="tiles"
             count-down-date="2026-12-31T00:00:00Z"
             double-digit-format="1">
          <div class="tile seconds" data-unit="seconds"><div class="digits"><div class="number" number-slot="seconds">00</div></div><div class="unit">Seconds</div><i class="edge bottom"></i><i class="edge top"></i><i class="edge right"></i><i class="edge left"></i></div>
          <div class="tile minutes" data-unit="minutes"><div class="digits"><div class="number" number-slot="minutes">00</div></div><div class="unit">Minutes</div><i class="edge top"></i><i class="edge left"></i></div>
          <div class="tile hours" data-unit="hours"><div class="digits"><div class="number" number-slot="hours">00</div></div><div class="unit">Hours</div><i class="edge top"></i><i class="edge bottom"></i><i class="edge left"></i><i class="edge right"></i></div>
          <div class="tile days" data-unit="days" aria-hidden="true"><div class="digits"><div class="number" number-slot="days">00</div></div><div class="unit">Day</div><i class="edge top"></i><i class="edge bottom"></i><i class="edge right"></i></div>
          <div class="sparks-layer" aria-hidden="true"></div>
        </div>
      </section>
    </div>
  </div>
</main>
```

---

## 🎛️ HTML Attribute API

Declarative configuration , **no JS to write** for 90% of use cases:

| Attribute | On element | Type | Default | What it does |
|---|---|---|---|---|
| `count-down-date` | `.tiles` | ISO 8601 string (UTC) | *now + 7 days* | The target deadline. Accepts `"YYYY-MM-DDTHH:MM:SSZ"` or any `Date.parse()`-able string. If missing, invalid, or already in the past it silently falls back to +7 days. |
| `double-digit-format` | `.tiles` | `"1"` / `"0"` | `"1"` | `1` → `00`–`59` (zero-padded). `0` → `0`–`59` (no pad). |
| `number-slot` | each `.number` div | `"seconds"` / `"minutes"` / `"hours"` / `"days"` | *(required)* | Binds the DOM slot to the countdown ticker. The script looks these up with `querySelector('[number-slot="…"]')`. |
| `data-unit` | each `.tile` div | `"seconds"` / `"minutes"` / `"hours"` / `"days"` | *(required)* | Used by the scroll choreography + collision detection to identify the 4 tile cards. |

---

## 🎚️ Configure Panel

Open by clicking the **Configure** button (bottom-right, overlaid on the character GIF), or call `window.openHelp && openHelp()` in the console.

Everything except **Save** is live-instant:

| Row | Live updates | Saved to localStorage |
|---|---|---|
| Heading | ✓ `input` as you type | ✓ |
| Target date + Target time (UTC) | ✓ on every input change | ✓ |
| Background sound | ✓ plays/pauses instantly | ✓ |
| Volume | ✓ drag slider, hear it change | ✓ |
| Double digit format | ✓ `00` ↔ `0` | ✓ |
| Show days | ✓ header switch + panel switch stay in sync | ✓ |
| Fonts , Display / UI / Mono | ✓ CSS variable swap as you type | ✓ |
| Quick presets (15m / 1h / 1d / 1w) | ✓ date/time inputs + deadline both update | Only on Save click |

Storage key: `cubecount:config:v1`. Versioned so future format migrations won't brick existing saves.

### Font switching

- **Preset selects** have 9 hand-picked faces per slot, plus a `__custom__` entry that reveals a free-text input.
- **Custom input**: type *any exact family name from [fonts.google.com](https://fonts.google.com)* (e.g. `Space Grotesk`, `Red Hat Display`, `Bricolage Grotesque`, `Cormorant Garamond`) → the Google Fonts `<link>` injects into `<head>` and the live page re-renders the new family immediately.
- System fonts (`Impact (system)`, `system-ui (system)`, `Consolas (system)`) skip Google CDN entirely , offline-safe.

---

## 🎯 Interaction map

| Input | Desktop | Mobile (coarse pointer) |
|---|---|---|
| **Scroll** | Drives pose progress 0→1. At 0.5 the cubes all pass through center → guaranteed sparks. | Same, scroll-stage height tuned to 1.9× viewport. |
| **Tap tiles** | No-op (scroll is primary) | **Tap-to-clang** , one-shot pose sweep, guaranteed collisions, Android haptic. |
| **Day-switch pill** | Top-right in header, toggles Day card vis. | Same, stacked below heading. |
| **Configure button** | Bottom-right corner on character. Opens modal. | Same, shrunk to 12–14em floating GIF overlay. |
| **Sound mute pill** | Bottom-left corner, tiny, 55% base opacity. | Same, 2.4–2.6em for thumb-ability. |

---

## ⚡ Performance & Animation quality

- **Frame-rate adaptive rAF.** The scroll pose lerp uses `progress += (target - progress) * (1 - 0.95^(Δms / 16.667))`, which scales the lerp factor by actual frame delta. It feels identical on 60 Hz, 120 Hz, and 144 Hz ProMotion displays.
- **GPU-happy transforms only.** All motion uses `transform: translate3d/rotate + opacity`. No layout-triggering properties animate.
- **Collision sparks are pooled.** `acquireSparkNode()` / `releaseSpark()` reuse DOM nodes via a `sparkPool[]`. MAX_SPARKS auto-scales on coarse pointers (70% cap) and tiny viewports (55% cap) to match mobile GPU budgets.
- **Zero setInterval.** The 1-second countdown uses `setInterval` for deadline math but all DOM transitions are CSS keyframe + `animationend` self-destruct listeners (no polling).
- **`prefers-reduced-motion` hardening.** Nukes animation & transition durations globally AND bails out of the JS lerp loop entirely.
- **Autoplay policy recovery.** Mobile browsers block `audio.play()` until a user gesture. If autoplay is blocked, the engine queues a one-shot `pointerdown / keydown / touchstart` listener on `document` to retry the next time the user interacts with anything on the page.

---

## 🗂️ Project Structure

```
.
├── index.html              # Live demo page. Edit count-down-date attribute to change the default deadline.
├── qa-timer.html           # Separate sandbox for testing dates (same assets).
├── style.css               # All styles, 4 breakpoints, 26 animations.
├── fonts.css               # @font-face registrations for local TTFs (Jujutsu Kaisen, Exo, Share Tech Mono).
├── timer.js                # Everything. ≈ 840 lines of strict-mode vanilla JS.
└── assets/
    ├── Jujutsu Kaisen.ttf  # Custom display face (local).
    ├── exo-*.ttf           # Fallback sans-serif weights.
    ├── share-tech-mono.ttf # Fallback mono.
    ├── character.gif       # Bottom-right mascot (204 KB).
    └── bg_song.mp3         # Background track (optional , remove or swap with any audio).
```

Single entry points, flat files, no build , **fork, hack, ship**.

---

## 🪪 Fonts

| Family | Source | License |
|---|---|---|
| **Jujutsu Kaisen** | `assets/Jujutsu Kaisen.ttf` (bundled) | *Verify the license of the TTF you supplied. If it is OFL-licensed, keep a copy in `assets/OFL.txt`.* |
| Anton, Archivo Black, Noto Sans JP, JetBrains Mono | Google Fonts CDN (falls back if offline) | **SIL Open Font License 1.1** , free for personal & commercial use. |
| Exo, Share Tech Mono | `assets/*.ttf` (bundled) | **SIL OFL 1.1** , attribution required in redistributions. |

For open-source distribution, **keep a copy of the SIL OFL text in `assets/OFL.txt`** per the OFL §2 when distributing the font binary files. *(See: https://scripts.sil.org/OFL)*

---

## 🤝 Open-source

### License

**MIT** , drop a LICENSE file in your repo root with this content, or pick your own:

```txt
MIT License

Copyright (c) 2026 Homesh Peter Paul

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
---

## ✍️ Author

Made by [**@peterultimate**](https://instagram.com/peterultimate).

<br>

> *"With regard to cursed technique… I'm overwhelmingly stronger."* — Ryomen Sukuna
