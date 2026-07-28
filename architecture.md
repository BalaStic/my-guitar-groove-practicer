# Architecture — My Guitar Groove Practicer

> **Audience:** Professional developers onboarding to the codebase or extending it.  
> **Version:** 1.0 · July 2026

---

## 1. Overview

*My Guitar Groove Practicer* is a **client-side-only Single Page Application** that generates infinite, looping drum + bass backing tracks so guitarists can practice in any key and style. There is no backend, no database, and no build-time data fetching — the entire product ships as a static bundle of HTML/CSS/JS.

Core capabilities:

| Feature | Detail |
|---|---|
| Groove styles | Rock 4/4, Blues Shuffle, Funk 16th |
| Root note | E2, A2, D2, G2 (guitar-friendly keys) |
| Tempo range | 60 – 180 BPM (live-adjustable while playing) |
| Audio synthesis | Tone.js (Web Audio API wrapper) — no samples, pure synthesis |
| Visualisation | Live step-sequencer display (16 or 12 cells, active cell highlighted) |
| Platform | Any modern browser, including iOS Safari (with mute-switch workaround) |

---

## 2. Tech Stack

| Layer | Technology | Version | Role |
|---|---|---|---|
| Build tool | [Vite](https://vitejs.dev/) | ^8.1 | Dev server, HMR, ES-module bundling, production build |
| Audio | [Tone.js](https://tonejs.github.io/) | ^15.1 | Web Audio synthesis + precision scheduling |
| Language | Vanilla JavaScript (ESM) | ES2022+ | No framework, no transpilation overhead |
| Styling | Vanilla CSS | — | Single file, no preprocessor |
| CI/CD | GitHub Actions | — | Auto-deploy to GitHub Pages on push to `main` |
| Hosting | GitHub Pages | — | Serves the `dist/` static bundle |

**Why no framework?** The UI is a handful of DOM nodes whose state is driven almost entirely by audio events. The complexity does not justify a reactive framework, and keeping Tone.js as the single source of truth for playback state avoids synchronisation issues between a virtual DOM and the Web Audio clock.

---

## 3. Repository Structure

```
my-guitar-groove-practicer/
├── index.html                  # Static shell — single HTML entry point
├── package.json                # npm manifest, three scripts: dev / build / preview
├── package-lock.json
├── vite.config.js              # Sets base URL for GitHub Pages sub-path deployment
├── README.md                   # User-facing Hungarian docs
├── architecture.md             # This document
├── project_kickoff.txt         # Original AI-assisted design conversation (context only)
├── .gitignore
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: build → publish to gh-pages branch
└── src/
    ├── main.js                 # Application bootstrap / entry point
    ├── grooves.js              # Data layer: groove templates + interval map
    ├── audio-engine.js         # AudioEngine class — all Tone.js interaction
    ├── ui.js                   # UIController class — all DOM interaction
    └── styles.css              # Presentation
```

---

## 4. High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser / DOM                    │
│                                                     │
│  index.html  ──── static shell (controls + canvas) │
│       │                                             │
│  src/main.js  ─── bootstrap: new AudioEngine()     │
│                             new UIController(ae)   │
│       │                            │               │
│       │           ┌────────────────┘               │
│       ▼           ▼                                 │
│  ┌──────────┐  ┌──────────────────────────────┐    │
│  │ grooves  │  │        UIController          │    │
│  │  .js     │  │  • DOM element refs          │    │
│  │ (data)   │  │  • Event listeners           │    │
│  └────┬─────┘  │  • Step display renderer     │    │
│       │        │  • Audio status indicator    │    │
│       │        └────────────┬─────────────────┘    │
│       │                     │  calls                │
│       │                     ▼                       │
│       │        ┌──────────────────────────────┐    │
│       └───────►│        AudioEngine           │    │
│  groove data   │  • Tone.js lifecycle         │    │
│  intervalMap   │  • Lazy synth init           │    │
│                │  • iOS unlock strategy       │    │
│                │  • onStepChange callback ──► UIController.updateStepDisplay()
│                └──────────────┬───────────────┘    │
│                               │                     │
│                               ▼                     │
│                    ┌──────────────────┐             │
│                    │    Tone.js       │             │
│                    │  Transport       │             │
│                    │  Sequence        │             │
│                    │  MembraneSynth   │             │
│                    │  NoiseSynth      │             │
│                    │  MetalSynth      │             │
│                    │  MonoSynth       │             │
│                    └──────────┬───────┘             │
│                               │                     │
│                               ▼                     │
│                    ┌──────────────────┐             │
│                    │  Web Audio API   │             │
│                    │  AudioContext    │             │
│                    └──────────────────┘             │
└─────────────────────────────────────────────────────┘
```

---

## 5. Module Breakdown

### 5.1 `src/main.js` — Bootstrap / Entry Point

```
Responsibilities:
  - Wait for DOMContentLoaded (handles both sync and async readyState)
  - Instantiate AudioEngine
  - Instantiate UIController(audioEngine)
  - No further logic
```

This file is intentionally minimal. The wiring between `AudioEngine` and `UIController` is established inside `UIController`'s constructor (the engine is injected as a dependency), keeping `main.js` as a pure composition root.

---

### 5.2 `src/grooves.js` — Data Layer

**Exports:**
- `grooves` — Record of named groove templates
- `intervalMap` — Maps symbolic bass note names to semitone offsets

#### Groove Template Schema

```js
{
  name: string,          // Human-readable label
  stepsPerBar: number,   // 16 for rock/funk, 12 for blues shuffle
  drums: {
    kick:  number[],     // Binary array, length === stepsPerBar
    snare: number[],     // 1 = trigger, 0 = rest
    hihat: number[]
  },
  bass: {
    pattern: string[]    // Symbolic: "root" | "3rd" | "5th" | "6th" | "oct" | "-"
  }
}
```

#### Interval Map

```js
{
  "root": 0,   // Tonic (unison)
  "3rd":  3,   // Minor third (blues)
  "5th":  7,   // Perfect fifth
  "6th":  9,   // Major sixth
  "oct":  12,  // Octave
  "-":    null // Rest / sustain (no new note triggered)
}
```

**Design principle:** The bass pattern is stored as *interval names relative to the root*, not as absolute MIDI notes. The actual frequency is computed at play time by `AudioEngine.playStep()` using `Tone.Frequency(rootNote).transpose(semitones).toNote()`. This makes the entire groove library key-agnostic.

---

### 5.3 `src/audio-engine.js` — AudioEngine Class

The heart of the application. All interaction with Tone.js is encapsulated here; no other module imports from `tone` directly.

#### Constructor

Creates plain state only — **no audio objects are created here**:

```
this.isPlaying     = false
this.currentStep   = 0
this.currentGroove = 'rock'
this.rootNote      = 'E2'
this.bpm           = 120
this.sequence      = null
this.synthsInitialized = false
this.audioUnlocked = false
```

> **Why no synths in the constructor?**  
> Web Audio API's `AudioContext` can only be created or resumed inside a user-gesture call stack. Constructing Tone.js synths (which internally create `AudioContext`) outside a gesture handler would either throw on iOS or result in a permanently suspended context.

#### Key Methods

| Method | Purpose |
|---|---|
| `unlock()` | Called on any user interaction (touch/click). Calls `Tone.start()` synchronously within the gesture. Also triggers `unmuteIOS()`. |
| `unmuteIOS()` | Plays a near-silent inline `<audio>` element to switch iOS audio session to "playback" category, bypassing the physical mute switch. |
| `initSynths()` | Creates the four Tone.js synths and sets their volumes. Called once, on the first `start()`. |
| `start()` | Awaits `Tone.start()`, lazy-inits synths if needed, creates a `Tone.Sequence`, starts `Tone.Transport`. |
| `playStep(time, step)` | Called by the Sequence callback on each tick. Reads the active groove, triggers appropriate synths, fires `onStepChange`. |
| `stop()` | Stops and disposes the `Tone.Sequence`, stops `Tone.Transport`, resets state. |
| `setGroove(name)` | Stops playback, swaps groove, restarts if was playing. |
| `setRootNote(note)` | Updates `this.rootNote` in place; takes effect on the next `playStep` call. |
| `setBPM(bpm)` | Updates `Tone.Transport.bpm.value` live if playing, otherwise just stores the value. |
| `getContextState()` | Returns `Tone.context.state` (`'running'` / `'suspended'` / `'closed'`). Used by `UIController` for the status indicator. |

#### Sequencer Design

```
Tone.Sequence(callback, [0,1,2,...,N-1], subdivisionString)
```

- `subdivisionString` is `"${stepsPerBar}n"` — e.g. `"16n"` (sixteenth notes) for 16-step grooves, `"12n"` (twelfth notes) for the 12-step blues shuffle.
- The callback receives a **scheduled audio time** (`time`), not wall-clock time. All `triggerAttackRelease` calls pass this `time` for sample-accurate scheduling.
- `onStepChange(step)` is a simple function property — `UIController` sets it after construction. This is a lightweight observer pattern that avoids circular imports.

#### Synth Topology

```
MembraneSynth (kick)  ──┐
NoiseSynth    (snare) ──┤
MetalSynth    (hihat) ──┼──► Tone.Destination ──► AudioContext output
MonoSynth     (bass)  ──┘
```

All four synths route directly to `Tone.Destination` (the master output). Volume is set as `dBFS` on each synth:

| Synth | Volume |
|---|---|
| Kick | −10 dBFS |
| Snare | −20 dBFS |
| Hi-hat | −25 dBFS |
| Bass | −15 dBFS |

---

### 5.4 `src/ui.js` — UIController Class

Handles all DOM interaction. Receives `AudioEngine` via constructor injection.

#### Responsibilities

| Concern | Implementation |
|---|---|
| DOM element binding | `initElements()` — caches all relevant element refs |
| Step display init | `initStepDisplay()` — creates 16 `.step` divs on load |
| Event wiring | `attachEventListeners()` — all `addEventListener` calls in one place |
| Play/Stop toggle | `togglePlayback()` — async, disables button during start, shows error on failure |
| Step highlight | `updateStepDisplay(activeStep)` — adds/removes `.active` CSS class |
| Audio status HUD | `updateAudioStatus()` — reflects `AudioContext.state` to the user |
| iOS unlock | One-shot listener on `touchend` / `pointerdown` / `click` that calls `audioEngine.unlock()` |

#### Event → Engine Call Mapping

```
#play-button  click  →  togglePlayback()           →  audioEngine.start() / stop()
#style-select change →  audioEngine.setGroove()    +  createSteps(newCount)
#root-select  change →  audioEngine.setRootNote()
#bpm-slider   input  →  audioEngine.setBPM()       +  update #bpm-value text
document      *      →  audioEngine.unlock()  (once, iOS guard)
```

#### Step Display

`createSteps(count)` clears `#step-display` and renders `count` new `<div class="step">` elements. This is called both on init (16 steps) and whenever the style selector changes (rock/funk = 16, blues = 12).

`updateStepDisplay(activeStep)` is called from `AudioEngine.onStepChange` — inside a Tone.js scheduler callback. Tone.js fires this on the audio clock thread but schedules DOM updates via `requestAnimationFrame`-compatible timing; direct DOM manipulation here is safe.

---

### 5.5 `index.html` — Static Shell

- Single `<div class="container">` layout: header → controls → play button → audio status → step visualiser → footer.
- Controls use semantic HTML (`<select>`, `<input type="range">`, `<button>`).
- `<script type="module" src="/src/main.js">` is the only script tag — Vite resolves the full module graph from here.
- The step display `<div id="step-display">` is empty at parse time; JS populates it.

---

### 5.6 `vite.config.js` — Build Configuration

```js
export default defineConfig({
  base: '/my-guitar-groove-practicer/',
});
```

The `base` option is required because the app is hosted at a GitHub Pages sub-path (`username.github.io/my-guitar-groove-practicer/`) rather than the domain root. Without it, all asset URLs in the built HTML would be absolute from `/` and 404.

---

## 6. Data Flow — Play Button to Audio Output

```
1. User taps PLAY
   └─► UIController.togglePlayback()
         ├─ Disables button, sets label to "STARTING..."
         └─► AudioEngine.start()  [async]
               ├─ await Tone.start()          → AudioContext moves to 'running'
               ├─ initSynths()  [first time]  → creates 4 Tone synths
               ├─ Tone.Transport.bpm = 120
               ├─ new Tone.Sequence(callback, steps, subdivision)
               ├─ sequence.start(0)
               └─ Tone.Transport.start()

2. Every N-th note (Transport tick)
   └─► Sequence callback(time, step)
         ├─ AudioEngine.playStep(time, step)
         │     ├─ groove.drums.kick[step]  → kickSynth.triggerAttackRelease('C1', '8n', time)
         │     ├─ groove.drums.snare[step] → snareSynth.triggerAttackRelease('8n', time)
         │     ├─ groove.drums.hihat[step] → hihatSynth.triggerAttackRelease('16n', time)
         │     └─ groove.bass.pattern[step]
         │           └─ intervalMap[symbol] → semitones
         │                └─ Tone.Frequency(rootNote).transpose(semitones).toNote()
         │                     └─ bassSynth.triggerAttackRelease(note, '8n', time)
         └─ AudioEngine.onStepChange(step)
               └─► UIController.updateStepDisplay(step)
                     └─ DOM: adds 'active' class to step cell N, removes from all others

3. User taps STOP
   └─► UIController.togglePlayback()
         └─► AudioEngine.stop()
               ├─ sequence.stop() + sequence.dispose()
               ├─ Tone.Transport.stop()
               ├─ isPlaying = false, currentStep = 0
               └─ UIController.updateStepDisplay(-1)  → clears all active highlights
```

---

## 7. iOS Audio Unlock Strategy

Mobile browsers (especially iOS Safari) enforce a strict policy: `AudioContext` must be created or resumed within a **synchronous** user-gesture call stack. Any `await` before `AudioContext.resume()` breaks the gesture association and leaves the context suspended.

Two complementary techniques are used:

### 7.1 Synchronous `Tone.start()` Gate

`UIController` registers a one-shot listener on `touchend`, `pointerdown`, and `click` at the document level. On the first interaction *anywhere* on the page, it calls `audioEngine.unlock()`, which calls `Tone.start()` **synchronously** (no `await` before it in the call stack).

### 7.2 iOS Mute-Switch Bypass (`unmuteIOS`)

On iOS, Web Audio follows the hardware mute switch by default. To override this, a near-silent `<audio>` element (a 4-byte WAV embedded as a `data:` URI) is created and played with `playsinline` + `webkit-playsinline`. This forces the iOS audio session into the "playback" category, which ignores the mute switch — the same mechanism used by music streaming apps.

The element reference is retained in `this._iosUnmuteEl` to prevent garbage collection, which would end the session.

---

## 8. CI/CD Pipeline

```
Developer pushes to main
        │
        ▼
GitHub Actions: deploy.yml
  ├─ actions/checkout@v4
  ├─ actions/setup-node@v4  (Node 20)
  ├─ npm ci                  (clean install from lockfile)
  ├─ npm run build           (vite build → dist/)
  └─ peaceiris/actions-gh-pages@v4
        └─ pushes dist/ to gh-pages branch
                │
                ▼
        GitHub Pages serves the static bundle
        at: https://<user>.github.io/my-guitar-groove-practicer/
```

No secrets beyond `GITHUB_TOKEN` (automatically provided by Actions) are required.

---

## 9. Known Limitations

| Area | Limitation |
|---|---|
| Groove library | Templates are statically defined; no runtime variation or randomisation |
| Bass synthesis | Sawtooth `MonoSynth` — functional but not realistic; no sample-based bass |
| Drum synthesis | Synthesised kick/snare/hihat — sounds electronic; no acoustic samples |
| Chord awareness | Single root note only; no chord progression support |
| Fills | Loops repeat identically every bar; no fill or transition logic |
| Mobile performance | No `AudioWorklet`; synthesis runs on the main thread |
| Error recovery | If the `AudioContext` is suspended mid-session (e.g. phone call), no auto-resume |
| Persistence | No state saved across sessions (groove, BPM, root note reset on reload) |

---

## 10. Planned Future Work (Roadmap)

These items were identified during the initial design session (`project_kickoff.txt`) and in the README:

| Priority | Feature | Notes |
|---|---|---|
| High | **Algorithmic groove generation** | Euclidean rhythm for drums; Markov-chain variation |
| High | **Chord progression support** | I–IV–V, ii–V–I; bass adapts to each chord root |
| Medium | **Fills** | Auto-insert drum fills every 4 or 8 bars |
| Medium | **Humanize** | Small random timing/velocity offsets for a live feel |
| Medium | **Groove save/load** | `localStorage` or exported JSON |
| Low | **MIDI export** | Generate a `.mid` file for DAW import |
| Low | **Additional styles** | Country, Bossa Nova, Latin |
| Low | **Sample-based drums** | Replace synthesis with `Tone.Players` + drum samples |

---

## 11. Extension Guide

### Adding a New Groove Style

1. Open `src/grooves.js`.
2. Add a new key to the `grooves` object following the schema in §5.2.
3. Add a matching `<option>` in `index.html` (`#style-select`).
4. No changes to `AudioEngine` or `UIController` are needed — both are groove-agnostic.

### Adding a New Bass Interval

1. Add the symbol and semitone offset to `intervalMap` in `src/grooves.js`.
2. Use the new symbol in any groove's `bass.pattern` array.

### Replacing Synthesis with Samples

1. In `AudioEngine.initSynths()`, replace the relevant `Tone.MembraneSynth` / `Tone.NoiseSynth` / `Tone.MetalSynth` with a `Tone.Players` instance pointing to audio files.
2. Adjust `AudioEngine.playStep()` to call `players.player('kick').start(time)` etc.
3. Ensure sample files are placed in `public/` so Vite copies them to `dist/` verbatim.

### Adding a Volume Mixer

1. Insert a `Tone.Channel` node per instrument between each synth and `Tone.Destination`.
2. Expose `channel.volume.value` setters on `AudioEngine`.
3. Add slider controls in `index.html` and wire them in `UIController.attachEventListeners()`.
