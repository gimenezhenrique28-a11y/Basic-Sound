# Music Analysis Guide — From Reference Track to Strudel Code

## How to Analyze a Track

When given a reference (URL, description, screenshot), systematically extract:

### 1. Tempo (BPM)

- Listen for the kick or snare pulse and count beats per minute
- Most electronic music: 120–180 BPM
- If given a URL: BPM is often in the track title, comments, or description
- When unsure, default to genre norm and mark it as approximate
- Convert to cps: `setcps(BPM / 120)`

### 2. Key / Tonal Center

- Identify the root note of the bass or pad
- Determine major vs minor (minor = dark, melancholy; major = bright, uplifting)
- Electronic music is mostly minor or modal (dorian, phrygian)
- If unsure: use C minor as default, note it as approximate

### 3. Rhythmic Structure

Analyze each drum layer separately:

**Kick drum:**
- 4-on-the-floor: `"bd*4"` (one kick every quarter note)
- Half-time: `"bd ~ ~ ~"` (kick only on beat 1)
- Syncopated: `"bd ~ bd ~ ~ bd ~ ~"` (off-beat kicks)
- Double kick: `"bd*4"` with variations like `"[bd bd] ~ ~ ~"`

**Snare/Clap:**
- Standard backbeat: `"~ ~ sd ~"` or `"~ sd ~ sd"` (beats 2 and 4)
- Half-time snare: `"~ ~ ~ sd ~ ~ ~ ~"` (only on beat 3)
- Clap layered: `"~ ~ cp ~"`

**Hi-hats:**
- Straight 8ths: `"hh*8"`
- Straight 16ths: `"hh*16"`
- Off-beat / "1e+a": `"~ hh ~ hh ~ hh ~ hh"`
- Shuffled: `"[hh ~]*4"` with swing
- Open hi-hat: `"oh(2,8)"` or `"~ ~ oh ~ ~ ~ oh ~"`

**Euclidean rhythms (very common in electronic music):**
- `bd(3,8)` — 3 beats in 8 steps (bossa nova feel)
- `bd(4,16)` — 4 beats in 16 steps (typical kick)
- `perc(5,8)` — 5 beats in 8 (complex percussion)
- `sd(2,8)` — snare on 2 and 4
- `oh(3,8)` — Afrobeat-style open hat

### 4. Bass Pattern

Map out:
- Rhythm: when does the bass hit? (locked to kick? syncopated? free?)
- Notes: root + which intervals? (root only, root+fifth, chromatic movement?)
- Duration: short/punchy or sustained/held?
- Timbre: sub (sine), mid-range (sawtooth/square), distorted?

**Common bass patterns:**
```javascript
// Locked to kick (house style)
note("c2 ~ c2 ~ c2 ~ c2 ~").s("sine")

// Walking bass
note("c2 ~ eb2 ~ g2 ~ bb1 ~")

// Syncopated
note("[c2 ~] ~ [~ c2] ~")

// Acid bassline
note("<c2!2 eb2 c2 bb1 c2 ~ ~>").s("sawtooth").lpq(20)
```

### 5. Harmonic / Chord Content

- What chord progression drives the track? (often 2–4 chords, looped)
- Are chords sustained or rhythmic?
- Voicing style: full chords, shell voicings, arpeggiated?

**Translating to Strudel:**
```javascript
// Sustained pads (slow chord changes)
"<Am7!2 Dm7!2 G7!2 Cmaj7!2>".voicings().slow(2).s("sawtooth").attack(0.3).release(2)

// Rhythmic stabs
note("<[c3,eb3,g3] ~ ~ ~>").s("sawtooth").attack(0.01).release(0.1)

// Drone with occasional change
note("<c2!4 bb1!4>").s("sine").slow(2)
```

### 6. Melody / Lead

- Identify the melodic phrase (usually 2–4 bars)
- Map to approximate scale degrees if exact pitches unknown
- Note rhythm: dense/arpy or sparse/melodic?
- Synth timbre: bright lead, soft flute-like, plucky?

**Identifying scale degrees without exact pitches:**
- If you know the key (e.g., C minor), the scale is: C D Eb F G Ab Bb C
- Degrees: 0=C, 2=D, 3=Eb, 5=F, 7=G, 8=Ab, 10=Bb
- Use `n("0 3 5 7").scale("C:minor")` to work in scale degrees

### 7. Texture & Effects

| Feature | What to Listen For | Strudel Code |
|---|---|---|
| Reverb | Spaciousness, tail on sounds | `.room(0.4).roomsize(2)` |
| Delay | Echo repeats | `.delay(0.5).delaytime(0.375)` |
| Filter sweep | Rising or falling tone color | `.lpf(sine.slow(8).range(200,3000))` |
| Distortion | Grit, saturation | `.distort(2)` or `.crush(8)` |
| Bit crush | Lo-fi, crunchy texture | `.crush(6)` |
| Sidechain | Pumping, pulsing pads | Use `.duckorbit()` |
| Tremolo | Amplitude flutter | `.tremolosync(4)` |

---

## Reading a YouTube/SoundCloud Page

When given a URL, extract from the page:
- **Track title**: often contains BPM, key, genre
- **Description**: sometimes has full breakdown, BPM, DAW info
- **Tags**: genre tags are useful
- **Comments**: fans often identify BPM, key, or production notes

Use this to build context before writing any Strudel code.

---

## Reading a Screenshot

### Piano Roll Screenshot
- X-axis = time, Y-axis = pitch (higher = higher pitch)
- Count grid lines between note starts for rhythm
- Read note names from the Y-axis labels
- Note length = duration
- Note height (if any velocity lane) = velocity/gain

### Spectrogram
- Low frequencies at bottom, high at top
- Bright spots = energy at that frequency
- Kick: bright blob at bottom (~50-100Hz)
- Snare: bright at 150-300Hz + 3-8kHz
- Hi-hats: bright at top (8-16kHz)
- Pads: broad bands in the middle

### Waveform View
- Identify transients (sharp spikes = drum hits)
- Count beat markers for BPM
- Loud/quiet sections indicate structure

---

## Translating Genre Feel

### Groove & Swing

Electronic music often has slight swing or groove. In Strudel:
```javascript
// Basic swing (shifts every other 16th note slightly late)
s("hh*16").swing()
s("hh*16").swing(0.6)  // 0.5=straight, 1=full swing
```

### Layering for Fullness

Thin-sounding Strudel code usually needs:
1. More gain balance (kick around 1.0, hats around 0.3–0.5, bass around 0.7)
2. Bass layering: sine sub + sawtooth mid layer
3. Stereo width: `.pan()` or `.jux(rev)` on elements
4. Reverb on non-kick/bass elements

### Making It Breathe

```javascript
// Use degradeBy for variation
s("hh*16").degradeBy(0.15)   // slight randomness

// Use every() for fills
s("sd*2").every(4, x => x.fast(2))   // double-time snare every 4 bars

// Use sometimes for variation
note("c3 e3 g3").sometimes(x => x.fast(2))
```

---

## BPM to CPS Reference Table

| BPM | setcps() | Genre |
|---|---|---|
| 100 | 100/120 ≈ 0.833 | Hip-hop, slow house |
| 120 | 1.0 | House |
| 124 | 124/120 ≈ 1.033 | Deep house |
| 128 | 128/120 ≈ 1.067 | Commercial house |
| 130 | 130/120 ≈ 1.083 | Progressive house |
| 133 | 133/120 ≈ 1.108 | Techno |
| 138 | 138/120 = 1.15 | Dubstep half-time |
| 140 | 140/120 ≈ 1.167 | Techno, electro |
| 145 | 145/120 ≈ 1.208 | Trance |
| 150 | 150/120 = 1.25 | Hard techno, hard trance |
| 160 | 160/120 ≈ 1.333 | Drum & bass |
| 170 | 170/120 ≈ 1.417 | Drum & bass, jungle |
| 174 | 174/120 = 1.45 | Jungle |
