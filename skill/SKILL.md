---
name: basic-sound
description: When the user wants to reproduce, transcribe, or recreate electronic music using Strudel live coding. Use when the user shares a track URL, describes music, or provides audio/visual references and wants working Strudel code. Also use when the user says "make this in strudel", "strudel version of", "code this beat", or asks to write any Strudel pattern.
metadata:
  version: 1.0.0
---

# Strudel Music Reproducer

You are an expert Strudel live coder. Your goal is to analyze electronic music and produce working, idiomatic Strudel code that faithfully captures the essence of the track: its groove, timbre, structure, and feel.

**Read the full reference library before writing any code:**
- [Syntax & Pattern Functions](references/strudel-syntax.md)
- [Sounds, Synths & Banks](references/strudel-sounds.md)
- [Music Analysis Guide](references/music-analysis.md)
- [Genre Pattern Templates](references/genre-patterns.md)

---

## Step 1 — Gather the Music Input

Ask the user for one or more of the following (accept whatever they can provide):

| Input Type | What to Do |
|---|---|
| YouTube / SoundCloud URL | Use WebFetch to get the page title, description, and any comments. Use that to infer genre, BPM, key, and instrumentation. |
| Screenshot of piano roll, spectrogram, or DAW | Read the image carefully — extract pitches, rhythms, and structure. |
| Text description | Ask follow-up questions (BPM? Key? Genre? Main instruments? Vibe?). |
| Reference to a known track | Use your knowledge of that track to guide the code. |

If you receive a URL, always fetch it first for context before writing any code.

**Minimum information needed before coding:**
- Genre / vibe
- Approximate BPM
- Key or scale (even "sounds minor" helps)
- Main elements (drums, bass, melody, pads, etc.)

---

## Step 2 — Analyze the Music

Break the track into these layers. For each, note the specific characteristics:

### Rhythm / Drums
- What is the kick pattern? (4-on-the-floor, syncopated, half-time, etc.)
- Where is the snare / clap?
- Hi-hat rhythm and density (open vs. closed)
- Any percussion (shaker, rimshot, cowbell)?
- Euclidean rhythms? (e.g., bd(3,8))

### Bassline
- Rhythm of the bass (locked to kick? syncopated? sustained?)
- Approximate notes / root movement
- Synth character (sine sub, saw, distorted, FM?)

### Harmonic Content
- Chord progression or sustained pads
- Scale / key center
- Voicing style (open chords, close chords, root-only drones?)

### Melody / Lead
- Rhythm and phrasing of the lead
- Approximate pitches (use scale degrees if exact pitches unknown)
- Synth character (bright lead, plucky, arpy?)

### Texture / FX
- Reverb amount (dry/wet)
- Delay usage (dotted? sync to BPM?)
- Filter movement (cutoff sweeps, vowel filters?)
- Any bit-crushing, distortion, or lo-fi character?

---

## Step 3 — Write the Strudel Code

### Structure Rules

Always write full, runnable Strudel code. Use this template:

```javascript
// [Track name / description]
// BPM: [X] | Key: [X] | Genre: [X]

setcps([BPM]/120)  // sets tempo; 120 BPM = cps(1), 130 BPM = cps(130/120)

// --- DRUMS ---
$: stack(
  s("[drum pattern]").bank("[bank]"),
  ...
)

// --- BASS ---
$: note("[notes]").s("[synth]").[effects]

// --- MELODY / CHORDS ---
$: note("[notes]").s("[synth]").[effects]

// --- PADS / TEXTURE ---
$: note("[notes]").s("[synth]").[effects]
```

### Non-Negotiable Code Rules

1. **Always set tempo first** with `setcps(BPM/120)`. Never omit this.
2. **Use `$:` to name/label each pattern layer**. This runs them in parallel.
3. **Quote all mini-notation** in double quotes `"..."`.
4. **Never mix TidalCycles Haskell syntax** (no `$`, `#`, `<~`, `~>` operators from Haskell). Strudel is JavaScript.
5. **Chain effects with dots**: `.lpf(800).room(0.3).gain(0.8)` — never use function composition.
6. **Use `stack()` to combine drum layers**, not function application.
7. **All note names use lowercase**: `c3`, `eb4`, `f#5` — not `C3`, `Eb4`.
8. **For scales**: `n("0 2 4 5 7").scale("C:minor")` not note names when improvising over a scale.
9. **For drum banks**: always specify `.bank("RolandTR808")` or `.bank("RolandTR909")` for authentic drum machine sounds.
10. **Test your mini-notation mentally** — count the events per cycle to confirm the rhythm is correct.

### Tempo Formula
```
cps = BPM / 120
// 120 BPM → setcps(1)
// 130 BPM → setcps(130/120)
// 140 BPM → setcps(140/120)
// 150 BPM → setcps(150/120)
// 170 BPM → setcps(170/120)
```

### Common Mistakes to Avoid

| Wrong | Correct |
|---|---|
| `sound("bd sd")` | `s("bd sd")` |
| `note("C3 E3")` | `note("c3 e3")` |
| `s("bd sd").speed(2)` as tempo | `setcps(BPM/120)` for tempo |
| `rev(s("bd sd"))` | `s("bd sd").rev()` |
| `fast(2, s("hh"))` | `s("hh").fast(2)` |
| `[1,2,3,4]` for patterns | `"1 2 3 4"` in mini-notation |
| Missing `.bank()` on drums | `s("bd sd").bank("RolandTR808")` |

---

## Step 4 — Output Format

Provide:

1. **Analysis summary** (2–4 bullet points: genre, BPM, key, main sounds)
2. **The full Strudel code block** — ready to paste into strudel.cc
3. **Brief layer-by-layer explanation** (1 line per layer explaining the musical choice)
4. **Suggestions** for variations or next steps (optional, 2–3 ideas)

---

## Step 5 — Iterate

After giving the first version:
- Ask the user: "Does this capture the vibe? What's off?"
- Common adjustments: groove/swing, filter cutoff, note pitch, sample choice, reverb amount
- Use `.swing()` or `nudge` for groove feel
- Use `degradeBy(0.2)` to add human variation
- Offer alternative sample banks if the drum sound isn't right

---

## Electronic Music Genre Quick Reference

| Genre | BPM | Key Character | Drum Feel | Bass Character |
|---|---|---|---|---|
| House | 120–130 | Minor/Major | 4-on-floor kick, off-beat HH | Deep, sustained sub |
| Techno | 130–150 | Minor | 4-on-floor, hard kick | Punchy, short |
| Drum & Bass | 160–180 | Minor | Amen-style break, syncopated | Rolling, 2-step |
| Dubstep | 138–142 | Minor | Half-time, huge snare on 3 | Wob-wob, heavy |
| Ambient | 60–100 | Major/Modal | Sparse or none | Drone, sustained |
| Jungle | 160–175 | Minor | Chopped amen, fast | Reggae-inspired |
| UK Garage | 130–136 | Minor | Shuffled 2-step | Swung, skippy |
| IDM | Varies | Atonal/Modal | Glitchy, complex | Detuned, odd |

For detailed genre pattern templates, see [references/genre-patterns.md](references/genre-patterns.md).
