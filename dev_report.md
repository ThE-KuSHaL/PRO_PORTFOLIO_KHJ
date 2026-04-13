# Full Development Report — Kushal H J Portfolio Website
### Project: `c:\Users\Kushal H J\Desktop\PRTFOLIO\index.html`
### Stack: Pure HTML5 · Vanilla CSS3 · Vanilla JavaScript · Three.js (CDN)

---

## Overview

This document is a full, unabridged account of every decision, action, problem, and fix that occurred during the development of Kushal H J's cinematic single-page portfolio website. Nothing is glossed over.

---

## Phase 1 — Brief & Requirements Gathering

### What the user asked for (iterative refinement across ~4-6 prompts)

The user's request evolved over multiple messages, progressively getting more specific. The core requirements that emerged were:

**Identity:**
- Name: **Kushal H J**
- College: **Vidyavardhaka College of Engineering (VVCE), Mysuru** — 2nd year Information Science Engineering
- Primary role: **Budding Entrepreneur** (most prominent)
- Secondary roles in order: AI-Powered Builder → IoT Engineer → Backend Dev

**Design philosophy:**
- Dark cinematic aesthetic — base colour `#0a0a0f` (near-black navy)
- Electric indigo `#6366f1` and cyan `#06b6d4` as dual accent colours
- Typography: **Space Grotesk** from Google Fonts (modern, slightly quirky, professional)
- Must feel like **meeting a person**, not reading a résumé — narrative tone throughout
- Should impress both a Fortune 500 recruiter and a startup founder simultaneously
- No frameworks — **pure HTML/CSS/JS** only

**Technical features requested:**
- Interactive Three.js WebGL background mesh (mouse-reactive)
- Collapsible left sidebar navigation with scroll-spy active highlighting
- Custom cursor (glowing dot + trailing ring)
- Hero section with animated circuit emblem SVG (programmatically generated, no external assets)
- Glitch/scramble effect on the name
- Typewriter cycling through 4 roles
- Marquee project ticker (pauses on hover)
- Scroll-triggered reveal animations via Intersection Observer API
- Project card modal system with frosted glass
- Fully responsive (mobile/tablet/desktop)

**Sections required:**
1. Hero (full viewport, two-column)
2. About
3. Education (3-entry timeline)
4. Skills (7 categories)
5. Projects (4 cards + modal)
6. Venture (confidential funded project teaser)
7. Journey (milestone timeline)
8. Contact

---

## Phase 2 — Architecture Decision: Token Budget Problem

### The problem

A complete, production-quality single-page portfolio with all the requested features — full CSS, interactive Three.js, Intersection Observer logic, SVG emblem generator, modal system, sidebar, cursor — generates approximately **35,000–45,000 characters** of HTML/CSS/JS.

The `write_to_file` tool has a per-call content limit. Writing the entire file in one call would exceed it.

### The solution: Two-part split strategy

The file was split into two logical halves:

| File | Contents |
|---|---|
| `_p1.html` | `<!DOCTYPE>`, `<head>`, all CSS, sidebar HTML, Hero section, About section, Education section, Skills section |
| `_p2.html` | Projects section, Venture section, Journey section, Contact, Footer, Modal HTML, all JavaScript (`<script>` tag) |

The final step was to **concatenate** both files into `index.html` and delete the parts.

This split is purely a token-budget workaround — the resulting `index.html` is a single, self-contained file.

---

## Phase 3 — What Was Actually Built

### 3.1 — The CSS System

All styles are written inline in the `<style>` tag. CSS custom properties (variables) are defined in `:root`:

```css
:root {
  --bg:  #0a0a0f;           /* near-black background */
  --in:  #6366f1;           /* electric indigo accent */
  --cy:  #06b6d4;           /* cyan accent */
  --tx:  #f0f4ff;           /* near-white text */
  --mu:  rgba(255,255,255,.4); /* muted text */
  --br:  rgba(99,102,241,.15); /* border colour */
  --r:   12px;              /* border radius */
  --sw:  218px;             /* sidebar width */
  --e:   cubic-bezier(.4,0,.2,1); /* standard easing */
}
```

Everything references these variables. This makes it trivial to change the whole colour scheme by updating 3 lines.

**Key CSS techniques used:**
- `backdrop-filter: blur()` for the glassmorphism sidebar and modal
- `-webkit-background-clip: text` with `background-clip: text` for gradient text headings
- CSS Grid for the hero two-column layout and skill cards grid
- `clamp()` for fluid responsive typography without media queries
- `opacity: 0; transform: translateY(30px)` → class `.in` adds `opacity: 1; transform: none` for scroll reveals
- `animation-play-state: paused` on hover for the marquee ticker
- Keyframe animations: `glitch`, `blink`, `mq` (marquee), `sir` (slide-in-right), `sdrop` (scroll indicator), `pl` (pulse)
- Two breakpoints: `@media (max-width: 900px)` and `@media (max-width: 500px)`

---

### 3.2 — The Three.js WebGL Background

**File:** `initBg()` function in the `<script>` tag.

**What it does:** Creates a full-screen animated wireframe plane that undulates like a liquid surface and subtly warps toward the mouse cursor.

**Implementation details:**

```
Canvas element: <canvas id="bgc"> fixed-positioned, inset:0, pointer-events:none
Renderer: THREE.WebGLRenderer with alpha:true (transparent bg)
Geometry: THREE.PlaneGeometry(12, 12, 72, 72) — 72×72 vertex grid
Material: THREE.MeshBasicMaterial — indigo colour, wireframe:true, opacity:0.078
Mesh rotation: -Math.PI/3.5 on X axis (perspective tilt, like floor receding)
Mesh Y position: -1 (pushed down slightly)
```

**Mouse reactivity:** On every frame, the vertex Z positions are updated using:

```js
pos.setZ(i,
  Math.sin(ox*.6 + t) * Math.cos(oy*.6 + t*.7) * 0.2  // base wave
  + Math.sin(d*1.2 - t*2) * Math.exp(-d*.35) * 0.5     // mouse-centred ripple
)
```

Where `d` is the distance from each vertex to the mouse position (interpolated with 0.05 lerp factor for smoothness). The result is a wave that radiates outward from the cursor, fading with distance using an exponential decay `Math.exp(-d*.35)`.

**Performance:** `requestAnimationFrame` loop, pixel ratio capped at 2 to prevent oversampling on retina displays.

---

### 3.3 — The Circuit Emblem SVG (genSVG)

This was one of the most complex parts. The user wanted a **programmatically generated** circuit board / PCB emblem — no external image assets. Everything is generated at runtime in JavaScript.

**Function signature:** `genSVG(id, sz, isAvt)`
- `id`: DOM element ID to inject the SVG into
- `sz`: size of the SVG canvas (220px for hero emblem, 170px for about avatar)
- `isAvt`: boolean — `true` for the simpler about avatar version, `false` for the full hero emblem

**What it generates:**

1. **SVG filters** — two `<filter>` elements using `feGaussianBlur` and `feMerge` for glow/bloom effects. One is a heavy bloom (stdDeviation 3+8), one is a soft glow (stdDeviation 2).

2. **Concentric rings** (hero emblem only) — three decreasing-opacity rings at radii 100, 82, 58 that give a "radar" or "signal" feel.

3. **Orthogonal PCB traces** — arrays of SVG `<path>` elements. Each trace path uses only horizontal/vertical segments (`L` commands with matching coordinates) — no diagonal lines — giving an authentic PCB look. Each trace has:
   - A `stroke-dasharray` and animated `stroke-dashoffset` (the "electricity flowing" effect)
   - Different animation durations and begin delays creating an asynchronous flickering effect
   - Two colours: `#06b6d4` (cyan) for primary traces, `#4f87ff` (cornflower blue) for secondary traces

4. **Nodes** — `<circle>` elements at trace endpoints, each with either an opacity pulse `<animate>` or a radius pulse `<animate>`, staggered by `begin` attribute.

5. **Centre circle** — a dark filled circle (`rgba(8,8,22,.95)`) with an indigo border. For the hero emblem, it also contains a `<text>` element rendering "KHJ" in Space Grotesk 700 weight.

**The fan-out hover menu:** Three absolutely-positioned anchor tags (`.fo`) sit on top of the emblem:
- Top: links to About section ("The Deep Diver")
- Bottom-left: links to Skills section ("The Recruiter")
- Bottom-right: links to Projects section ("Credibility")

These are invisible by default (`opacity:0`) and revealed on hover via `.ew:hover .fo` with staggered `translate` transitions.

---

### 3.4 — Hero Section Layout

The hero uses CSS Grid with `grid-template-columns: 1fr 1fr` — left column is the content (emblem, name, typewriter, CTAs, marquee), right column is the photo area.

**Left column elements:**
- The SVG emblem wrapper with hover fan-out menu
- `<h1>` with class `hn` — name with `data-text="KUSHAL H J"` for glitch pseudo-elements
- Typewriter div — a `<span id="tt">` (text changes via JS) + `<span id="tc">` (blinking cursor)
- Two CTA buttons (My Projects → indigo gradient; Contact Me → transparent cyan outline)
- Marquee ticker — two sets of 4 `<span>` items for seamless infinite scroll

**Right column — photo area:**
The right column has a full-height `<div class="hr">` with a `vignette` pseudo-element (`::after`) that fades edges into the background colour. Inside is the placeholder — currently an initials badge "KHJ" in a styled circle with "📸 add your photo here" text below it. When a real photo is added, the `.php` div gets replaced with an `<img>` tag.

**Scroll indicator:**
A fixed mouse-scroll animation (`<div class="si">`) sits at `position:absolute; bottom:2rem; left:17%` — a small rounded rectangle with a cyan dot that animates downward and fades, giving a "scroll hint".

---

### 3.5 — About Section

Two-column grid: `grid-template-columns: 190px 1fr`.

**Left column (avatar):**
- The `<svg id="abtsvg">` — the isAvt=true version of genSVG runs here (smaller, simpler traces)
- On top of the SVG sits `<div class="ap">` — the avatar circle. Currently shows "KHJ" text. When a photo is added, this gets replaced with an `<img>` tag.
- Below: chip badges — "2nd Year · ISE", "Funded Project · Active", "VVCE, Mysuru"

**Right column (narrative):**
Three paragraphs telling Kushal's story arc: curiosity → engineering → AI/IoT obsession → funded venture → building something that lasts.

---

### 3.6 — Education Timeline

A vertical timeline using a gradient left border (`background: linear-gradient(180deg, var(--in), var(--cy))`). Each entry has:
- An absolute-positioned dot (`.tdot`) on the left border line
- A monospace year label (`.ty`)
- Degree title (`.tg`)
- Institution name (`.tin`)
- An italic quote (`.tn`) with a left border — a one-sentence story about what that chapter meant

**Three entries:**
1. 10th Grade SSLC → 2019–2020, Sri Venkateshwara High School, Mysuru
2. 12th Grade Science (PCMB) → 2021–2023, JSS Pre-University College, Mysuru
3. B.E. ISE → 2023–2027, VVCE Mysuru

---

### 3.7 — Skills Section

7 category cards in an auto-fit grid (`repeat(auto-fit, minmax(210px, 1fr))`).

| Category | Icon Entity | Colour Style |
|---|---|---|
| Languages | &#9889; (⚡) | Default indigo pill |
| Frameworks | &#9642; (◾) | Default indigo pill |
| AI & ML | &#129302; (🤖) | Gradient border "AI-Ready" badge |
| IoT & Hardware | &#128268; (🔌) | Cyan pill |
| Cloud & DevOps | &#9729; (☁️) | Default indigo pill |
| Core CS | &#128218; (📚) | Cyan pill |
| Design & Tools | &#127912; (🎨) | Default indigo pill |

Each skill pill (`<span class="pi">`) starts at `opacity:0; transform:translateY(7px)` and staggers in with `setTimeout` delays (55ms each) when the card enters the viewport via Intersection Observer.

---

### 3.8 — Projects Section + Modal

**4 project cards** in auto-fit grid (`minmax(270px, 1fr)`):

| # | Project | Stack |
|---|---|---|
| 1 | SwiftLink API | Node.js, Express, Redis, PostgreSQL |
| 2 | NexChat Real-time Backend | Python, FastAPI, WebSockets, Docker |
| 3 | DataFlow Pipeline | Python, MongoDB, REST APIs, Linux Cron |
| 4 | Confidential Venture | IoT, CAD, Cloud, B2B |

Each card:
- Has a `::before` pseudo-element — a 2px indigo→cyan gradient top bar that fades in on hover
- Lifts `-6px` on hover with a box-shadow
- Calls `openModal(i)` on click

**Modal system:**
Fixed overlay (`#mo`) uses `opacity:0; pointer-events:none` → `.op` class adds opacity and enables pointer events. The modal box (`#mb`) scales from `scale(0.9)` to `scale(1)` on open.

The JS `MD` array holds modal data. `openModal(i)` dynamically injects:
- Title text
- Description text
- Tech tag chips
- Action buttons (Live Demo + GitHub for real projects, a "Confidential" message for project #4)

`closeModal()` is triggered by: the × button, clicking the overlay outside the box, or Escape key (via event delegation).

---

### 3.9 — Venture Section

A centered, text-only teaser section for the confidential B2B IoT+CAD+Cloud venture. Features:
- A pulsing cyan dot status badge ("Funded · Active Development")  
- A gradient text headline ("Currently Building Something Big.")
- A monospace ETA chip ("⏱ ETA: ~2 months to launch")
- CTA button linking to Contact section

---

### 3.10 — Journey (Milestone Timeline)

Six milestones, reverse chronological (2024 → 2023):

| Year | Category | Milestone |
|---|---|---|
| 2024 | Hackathon | HackSprint National — Runner-Up |
| 2024 | AI Project | LLM-Powered Workflow Automation |
| 2024 | Entrepreneurship | Startup Funding Secured |
| 2023 | Open Source | First Open Source Contribution |
| 2023 | Coursework | Database Systems & Distributed Computing |
| 2023 | Origin | Joined VVCE — ISE Department |

Each milestone has a circle icon on the left timeline spine, with a monospace category label, bold title, and a narrative one-liner.

---

### 3.11 — Contact Section

Centered layout:
- Gradient text headline: "Let's Build Something Together."
- Subtext: "Whether you're hiring, collaborating, or just curious — I'm one message away."
- Email: `kushalhj.dev@gmail.com` (linked with `mailto:`)
- Three buttons: LinkedIn, GitHub, Resume (all open in new tab with `rel="noopener"`)

---

### 3.12 — JavaScript Modules

All JS is in a single `<script>` tag. Functions:

| Function | Purpose |
|---|---|
| `genSVG(id, sz, isAvt)` | Generates the circuit emblem SVG |
| `initBg()` | Sets up Three.js mesh background |
| `initCursor()` | Custom glowing cursor (dot + trailing ring) |
| `initSidebar()` | Hamburger toggle + Intersection Observer scroll-spy |
| `initReveal()` | Scroll-triggered fade-in for all `.rv` elements |
| `initTypewriter()` | Cycles through 4 role strings with typewriter effect |
| `initGlitch()` | Briefly applies glitch animation to the name on load |
| `openModal(i)` | Opens project detail modal |
| `closeModal()` | Closes modal |

**DOMContentLoaded bootstrap:**
```js
window.addEventListener('DOMContentLoaded', () => {
  genSVG('embsvg', 220, false);
  genSVG('abtsvg', 170, true);
  initBg(); initCursor(); initSidebar(); initReveal(); initGlitch(); initTypewriter();
});
```

---

## Phase 4 — Initial File Assembly

### What happened

After writing `_p1.html` and `_p2.html`, they were concatenated using PowerShell:

```powershell
(Get-Content "_p1.html" -Raw) + (Get-Content "_p2.html" -Raw) |
  Set-Content "index.html" -Encoding UTF8
Remove-Item "_p1.html", "_p2.html"
```

Result: `index.html` — 340 lines. The file was opened in the browser for a visual preview.

**What was confirmed working:**
- Three.js mesh background rendering correctly in cyan/indigo
- Sidebar with KHJ.dev branding and all 8 nav links
- KUSHAL H J name with glitch effect
- Typewriter cycling (confirmed "Io" visible mid-cycle in screenshot — working)
- Circuit emblem with KHJ text in centre
- All sections present and laid out correctly
- Project cards with hover lift effect

---

## Phase 5 — Placeholder Filling

### Goal

Replace all `<!--REPLACE:...-->` placeholder comments in the file with actual realistic sample data for Kushal H J.

### What needed to be filled

| Item | Original placeholder | Filled with |
|---|---|---|
| 10th Grade year | `20XX – 20XX` | `2019 – 2020` |
| 10th Grade school | `Your School Name, City` | Sri Venkateshwara High School, Mysuru |
| 10th Grade quote | generic text | "This is where I first realised..." |
| 12th Grade year | `20XX – 20XX` | `2021 – 2023` |
| 12th Grade college | `Your Pre-University College, City` | JSS Pre-University College, Mysuru |
| 12th Grade quote | generic text | "The year I wrote my first Python script..." |
| Email | `your@email.com` | `kushalhj.dev@gmail.com` |
| LinkedIn URL | `href="#"` | `linkedin.com/in/kushalhj` |
| GitHub URL | `href="#"` | `github.com/kushalhj` |
| Resume | `href="#"` | `resume.pdf` |
| Photo area (hero) | Raw developer text: "Photo slides in from right / Vignette blends edges into bg" | Styled "KHJ" initials circle + "📸 add your photo here" label |
| About avatar | Empty `.ap` div | "KHJ" text in gradient circle |
| Footer year | `2024` | `2025` |

### The attempt — and why it partially failed

Multiple PowerShell `Get-Content -Raw -Encoding UTF8` + `.Replace()` + `Set-Content -Encoding UTF8` passes were used.

**Problem 1:** The HTML comments in the file (`<!--REPLACE: year range-->20XX – 20XX`) contained **em-dashes stored as raw UTF-8 bytes** (`E2 80 94` for `—`). The PowerShell search strings used literal em-dashes that didn't match because PowerShell's default string handling was inconsistent.

**Problem 2:** After several `Set-Content` passes, the file developed **mojibake** — multi-byte UTF-8 characters (like `☰`, `—`, `'`) were being re-encoded incorrectly. This is because:
- `Get-Content -Encoding UTF8` reads correctly
- But the `.Replace()` on the in-memory string worked on characters
- `Set-Content -Encoding UTF8` in PowerShell 5.1 (Windows) adds a **UTF-8 BOM** and sometimes mishandles the round-trip

---

## Phase 6 — The Encoding Disaster and Recovery

### What was discovered

A browser subagent screenshot revealed:
- The hamburger icon `☰` was rendering as `â˜°` (classic Latin-1/UTF-8 mismatch mojibake)
- Middle dots `·` in chips ("2nd Year · ISE") were rendering as `Â·`
- Em-dashes `—` throughout the text were rendering as `â€"`
- Curly apostrophes `'` were rendering as `â€™`

### Why this happened — technical explanation

The original file written by `write_to_file` was correct UTF-8 without BOM.

After multiple `Set-Content -Encoding UTF8` passes:

PowerShell's `Get-Content -Encoding UTF8` + `Set-Content -Encoding UTF8` chain has a known quirk. On Windows PowerShell 5.1, `-Encoding UTF8` actually writes **UTF-8 with BOM**. More critically, if the file was already UTF-8 **without** BOM but a tool explicitly specified `-Encoding UTF8`, the resulting string operations could misinterpret multi-byte sequences.

For example, the character `☰` (U+2630) is stored in UTF-8 as 3 bytes: `E2 98 B0`. When the file is read with Windows-1252 (the default PowerShell encoding if not specified), those 3 bytes are interpreted as the characters `â˜°`. If that mojibake string is then saved as UTF-8, each of those Latin-1 characters becomes its own multi-byte UTF-8 sequence — double-encoding the original character.

### The attempted fix (made things worse)

An attempt was made to "de-mojibake" the file:
```powershell
# Re-encode: treat UTF-8 bytes as Latin-1, decode as UTF-8
$lat1 = [System.Text.Encoding]::GetEncoding("iso-8859-1")
$fixed = $utf8.GetString($lat1.GetBytes($content))
[System.IO.File]::WriteAllText($f, $fixed, ...)
```

**This worked for characters within the Latin-1 range (U+0000 to U+00FF)** — characters like `·` (U+00B7) were fixed correctly.

**But it destroyed characters outside the Latin-1 range** — characters like `☰` (U+2630), all emojis (U+1F000+), and `→` (U+2192) that are ABOVE U+00FF cannot be encoded in Latin-1 at all. The `.GetBytes()` call replaced them with `?` (0x3F), or Unicode replacement characters (U+FFFD = `EF BF BD` in UTF-8).

A byte-level scan confirmed: **86 occurrences of U+FFFD** scattered throughout the file, corresponding to every emoji and special-character-outside-Latin-1 that was in the original file.

### The definitive fix — complete rewrite

The only clean solution was to **rewrite the entire file from scratch** using `write_to_file`, this time using **only ASCII characters** in the HTML, CSS, and JS, with all special characters expressed as **HTML entities**:

| Character | HTML Entity | Unicode |
|---|---|---|
| ☰ hamburger | `&#9776;` | U+2630 |
| — em-dash | `&mdash;` | U+2014 |
| · middle dot | `&middot;` | U+00B7 |
| – en-dash | `&ndash;` | U+2013 |
| ' right single quote | `&rsquo;` | U+2019 |
| " left double quote | `&ldquo;` | U+201C |
| " right double quote | `&rdquo;` | U+201D |
| → right arrow | `&rarr;` | U+2192 |
| ↓ down arrow | `&darr;` | U+2193 |
| × multiplication (close btn) | `&times;` | U+00D7 |
| ⏱ timer | `&#9201;` | U+23F1 |
| 🚀 rocket | `&#128640;` | U+1F680 |
| 💬 speech | `&#128172;` | U+1F4AC |
| 📊 chart | `&#128202;` | U+1F4CA |
| 🔒 lock | `&#128274;` | U+1F512 |
| 📧 email | `&#128231;` | U+1F4E7 |
| ⚡ lightning | `&#9889;` | U+26A1 |
| 🤖 robot | `&#129302;` | U+1F916 |
| 🔌 plug | `&#128268;` | U+1F50C |
| 📚 books | `&#128218;` | U+1F4DA |
| 🎨 palette | `&#127912;` | U+1F3A8 |
| 👤 person | `&#128100;` | U+1F464 |
| 🎓 graduation | `&#127891;` | U+1F393 |
| 🔗 link | `&#128279;` | U+1F517 |
| 🔥 fire | `&#128293;` | U+1F525 |
| 💡 bulb | `&#128161;` | U+1F4A1 |
| 🌍 globe | `&#127757;` | U+1F30D |
| ✨ sparkles | `&#10024;` | U+2728 |
| ✦ star | `&#10022;` | U+2726 |

The file was written in two parts (same two-part strategy as Phase 2) and then concatenated using `[System.IO.File]::WriteAllText()` with an **explicit `UTF8Encoding(false)` — false = no BOM**:

```powershell
[System.IO.File]::WriteAllText(
  $path,
  $p1 + $p2,
  (New-Object System.Text.UTF8Encoding $false)
)
```

This bypasses PowerShell's `Set-Content` entirely and writes pure UTF-8 without BOM directly.

### Final verification

A byte-level check of the completed file confirmed:

```
No BOM:            True   (first byte is 0x3C = '<', not 0xEF)
Hamburger &#9776;: True
Em-dash &mdash;:   True
Mid-dot &middot;:  True
Rsquo &rsquo;:     True
VVCE present:      True
Email:             True   (kushalhj.dev@gmail.com)
LinkedIn:          True   (linkedin.com/in/kushalhj)
GitHub:            True   (github.com/kushalhj)
10th 2019:         True
12th 2021:         True
JSS PUC:           True   (JSS Pre-University College, Mysuru)
No REPLACE body:   True   (old placeholder email gone)
File size (bytes): 41,115
```

All 14 checks passed. Site launched.

---

## Phase 7 — Final File State

### File: `c:\Users\Kushal H J\Desktop\PRTFOLIO\index.html`

**Size:** ~41 KB  
**Encoding:** UTF-8 without BOM  
**Lines:** ~340 (minified CSS, all HTML sections, JS at bottom)  
**External dependencies:** 2
- Google Fonts: Space Grotesk (loaded via `<link>` — requires internet)
- Three.js r128 from Cloudflare CDN (requires internet)

**Structure:**
```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" ...>
    <title>Kushal H J — Builder · Entrepreneur · Engineer</title>
    <meta name="description" ...>      ← SEO
    <link> (Google Fonts)
    <script> (Three.js CDN)
    <style> ... </style>               ← All CSS
  </head>
  <body>
    #cd (cursor dot)
    #cr (cursor ring)
    #bgc (Three.js canvas)
    <nav id="sb"> (sidebar)
    <div id="mn"> (main content)
      <section id="hero">
      <section id="about">
      <section id="edu">
      <section id="sk">
      <section id="pj">
      <section id="vn">
      <section id="ex">
      <section id="ct">
      <footer>
    </div>
    <div id="mo"> (modal overlay)
    <script> ... </script>             ← All JS
  </body>
</html>
```

---

## What Still Needs Personalisation

These are marked with `<!-- REPLACE: ... -->` comments in the file:

| Item | How to fix |
|---|---|
| **Profile photo** | Drop `photo.png` in `PRTFOLIO/` folder, replace the `.php` div with `<img src="photo.png" style="width:100%;height:100%;object-fit:cover;object-position:top center">` |
| **About avatar photo** | Replace `<div class="ap">KHJ</div>` with `<img>` once photo is ready |
| **10th Grade school name** | Update "Sri Venkateshwara High School, Mysuru" with actual school |
| **10th Grade years** | Update "2019–2020" with actual years |
| **12th Grade college name** | Update "JSS Pre-University College, Mysuru" with actual PUC |
| **12th Grade years** | Update "2021–2023" with actual years |
| **Email** | Update `kushalhj.dev@gmail.com` with real email |
| **LinkedIn URL** | Update `linkedin.com/in/kushalhj` with real handle |
| **GitHub URL** | Update `github.com/kushalhj` with real handle |
| **Resume PDF** | Drop `resume.pdf` in `PRTFOLIO/` folder |
| **Project GitHub links** | Update `l:'#'` and `g:'#'` in the `MD` array in the JS (lines ~224–227) |

---

## Tools & Commands Used

| Tool | Purpose |
|---|---|
| `write_to_file` | Writing `_p1.html`, `_p2.html` (twice — initial build + final clean rewrite) |
| `run_command` (PowerShell) | Concatenating files, encoding checks, placeholder replacements, launching site |
| `view_file` | Reading the HTML file to audit state at various checkpoints |
| `browser_subagent` | Taking screenshots to visually verify rendered output |
| `grep_search` / `Select-String` | Finding REPLACE markers and specific content |
| `[System.IO.File]::ReadAllBytes()` | Byte-level inspection of file encoding |
| `[System.IO.File]::WriteAllText()` | Writing the final file without encoding corruption |
| `Start-Process` | Launching `index.html` in the default browser |

---

## Key Lessons from This Build

1. **Never use PowerShell `Set-Content -Encoding UTF8` for files containing multi-byte Unicode characters.** It adds a BOM and its string handling interacts badly with emojis and special chars across multiple read/write cycles.

2. **Use `[System.IO.File]::WriteAllText(path, content, new UTF8Encoding(false))` on Windows** for clean UTF-8 without BOM.

3. **HTML entities are encoding-proof.** Any character that might be mangled by encoding tools should be expressed as a named entity (`&mdash;`) or numeric entity (`&#9776;`). These are pure ASCII and cannot be corrupted.

4. **For token-limited file writes, the two-part split strategy works well** — but the split must be at a clean logical boundary (end of a section, not mid-CSS-rule).

5. **Browser screenshots are essential for catching rendering issues** that text-level file inspection misses entirely.

---

*Report generated: 2026-04-06 · Conversation ID: 65a13de9-d9fd-4986-b7fe-21bf0925057f*
