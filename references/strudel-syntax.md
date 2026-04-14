# Strudel Syntax & Pattern Functions Reference

## Mini-Notation

Mini-notation is the pattern language inside quoted strings. Always use double quotes `"..."`.

### Sequencing

| Symbol | Meaning | Example |
|---|---|---|
| space | Divide cycle equally between events | `"bd sd hh cp"` — 4 events, each 1/4 cycle |
| `[]` | Nest / subdivide time | `"bd [sd sd] hh"` — sd plays twice in the 2nd quarter |
| `<>` | Alternate one per cycle | `"<bd cp>"` — bd on cycle 1, cp on cycle 2 |
| `*N` | Repeat N times faster | `"hh*8"` — 8 hi-hats per cycle |
| `/N` | Play once every N cycles | `"[bd sd]/2"` — pattern takes 2 cycles to complete |
| `~` or `-` | Rest / silence | `"bd ~ sd ~"` — bd on 1, rest, sd on 3, rest |
| `,` | Parallel / chord (inside `[]`) | `"[c3,e3,g3]"` — all three at once |
| `@N` | Elongate event (weight N) | `"bd@3 sd"` — bd takes 3/4, sd takes 1/4 of the cycle |
| `!N` | Replicate N times (no speed change) | `"bd!3 sd"` — three bds then sd, all equal length |
| `?` | 50% chance of playing | `"hh? sd"` — hh plays randomly |
| `?0.2` | 20% chance of playing | `"hh?0.2"` — rare hi-hat |
| `\|` | Random choice | `"[bd\|cp]"` — randomly bd or cp each cycle |
| `(n,k)` | Euclidean rhythm — n beats in k steps | `"bd(3,8)"` — 3 beats in 8 steps |
| `(n,k,r)` | Euclidean with rotation offset | `"bd(3,8,2)"` — rotated by 2 |
| `:N` | Select sample variant (0-indexed) | `"hh:0 hh:1 hh:2"` — different hh samples |

### Nested Patterns Examples

```javascript
// 4-on-the-floor with shuffled hi-hats
s("bd*4, ~ sd ~ sd, [hh hh:1]*4")

// Syncopated kick
s("bd ~ ~ bd ~ bd ~ ~")

// Euclidean 3-against-8 with snare on 3 and 7
s("bd(3,8), ~ ~ sd ~ ~ ~ sd ~")

// Bass pattern with subdivisions
note("[c2 ~ [c2 eb2]] [g1 ~ ~ ~]")
```

---

## Core Pattern Functions

### Timing

```javascript
setcps(1)           // Set cycles per second (1 = 120 BPM, 0.5 = 60 BPM)
// Formula: setcps(BPM / 120)

s("bd").fast(2)     // Double speed
s("bd").slow(2)     // Half speed
s("bd").early(0.1)  // Shift event 0.1 cycles earlier
s("bd").late(0.1)   // Shift event 0.1 cycles later
```

### Volume & Dynamics

```javascript
s("bd").gain(0.8)           // Volume 0–1 (can go above 1, careful)
s("bd").velocity("0.5 1")   // Velocity 0–1, multiplied with gain
s("hh").gain(".4!2 1 .4!2 1") // Accent pattern for groove
```

### Stacking & Combining

```javascript
// Stack: all patterns run in parallel (use for layers)
stack(
  s("bd*4"),
  s("~ sd ~ sd"),
  s("hh*8").gain(0.5)
)

// Cat: run patterns in sequence, one per cycle
cat(
  s("bd sd"),
  s("cp hh")
)

// Seq: run steps in sequence
seq(s("bd"), s("sd"), s("hh"))
```

### Transformations

```javascript
s("bd sd hh").rev()           // Reverse pattern
s("hh*8").fast(2)             // Double speed
s("bd").slow(4)               // Spread over 4 cycles
s("bd sd").every(4, x => x.fast(2))  // Every 4th cycle, apply transform
s("bd").sometimes(x => x.gain(0.5)) // Randomly apply
s("bd").often(x => x.crush(4))      // More often
s("bd").rarely(x => x.gain(0))      // Rarely
s("hh").degradeBy(0.2)        // Random 20% chance of silence
s("bd").jux(rev)              // Apply reverse only to right channel
s("bd").juxBy(0.5, rev)       // Partial stereo width
```

### Pattern Layering

```javascript
// Superimpose: layer a transformed copy on top
s("bd sd").superimpose(x => x.fast(2).gain(0.3))

// Off: offset a copy of the pattern
s("bd sd").off(0.125, x => x.speed(2).gain(0.5))
```

---

## Notes & Pitch

```javascript
note("c3 e3 g3")          // Note names (always lowercase)
note("c3 eb3 g3")         // Flat = 'b' after note letter
note("c3 f#3 g3")         // Sharp = '#'
note("60 64 67")          // MIDI numbers (middle C = 60)
freq("220 440 880")       // Frequencies in Hz

// Scale quantization
n("0 1 2 3 4 5 6 7").scale("C:minor")   // Scale degrees
n("0 2 4 5 7 9 11").scale("C:major")
n(run(8)).scale("D:dorian")             // run(N) = 0 1 2 ... N-1

// Transposition
note("c3 e3 g3").transpose(2)           // Up 2 semitones
note("c3 e3 g3").transpose("<0 2 4>")   // Alternate transpositions

// Scale-aware transposition
n("0 2 4").scale("C:minor").scaleTranspose(1) // Up one scale degree
```

### Available Scale Names
`major`, `minor`, `dorian`, `phrygian`, `lydian`, `mixolydian`, `locrian`,
`minor pentatonic`, `major pentatonic`, `blues`, `whole tone`, `chromatic`,
`harmonic minor`, `melodic minor`

Format: `"Root:scaleName"` — e.g., `"G:dorian"`, `"Bb:minor"`, `"F#:major"`

---

## Chords & Voicings

```javascript
// Chord voicings (chord symbols → actual notes)
"<Am7 Dm7 G7 Cmaj7>".voicings('lefthand')
"<Fm9 Bb7 Ebmaj7>".voicings()

// Root notes from chord symbols (useful for bass)
"<Am Dm G C>".rootNotes(2)   // Root notes at octave 2

// Chord symbols: Am, Dm, G, C, Cmaj7, Am7, Dm9, etc.
```

---

## Envelopes (ADSR)

```javascript
note("c3").s("sawtooth")
  .attack(0.01)    // attack time in seconds
  .decay(0.1)      // decay time
  .sustain(0.5)    // sustain level 0–1
  .release(0.3)    // release time

// Shorthand
.adsr("0.01:0.1:0.5:0.3")
```

---

## Filters

```javascript
// Low pass filter (cuts highs)
.lpf(800)               // cutoff frequency Hz
.lpf("<800 400 200>")   // animated cutoff
.lpq(10)                // resonance 0–50

// High pass filter (cuts lows)
.hpf(200)
.hpq(5)

// Band pass filter
.bpf(1000)
.bpq(5)

// Vowel formant filter
.vowel("<a e i o u>")

// Filter envelopes
.lpf(200).lpenv(4)      // +4 octaves of filter sweep
.lpa(0.1)               // filter attack
.lpd(0.3)               // filter decay
```

---

## Effects

```javascript
// Reverb
.room(0.5)              // send level 0–1
.roomsize(2)            // room size 0–10

// Delay
.delay(0.5)             // send level 0–1
.delaytime(0.375)       // delay time in seconds (or use BPM-synced: 0.375 = dotted 8th at 120)
.delayfeedback(0.6)     // feedback 0–1

// Distortion
.distort(2)             // 0–11
.crush(8)               // bit depth 1–16 (lower = more crushed)
.coarse(4)              // sample rate reduction

// Panning
.pan(0.3)               // 0 = left, 0.5 = center, 1 = right
.pan(sine.slow(4))      // auto-pan with LFO

// Pitch
.speed(1.5)             // sample playback speed (pitch shift for samples)

// Compression
.compressor("-20:4:3:.002:.1")  // threshold:ratio:knee:attack:release

// Tremolo
.tremolosync(4)         // tremolo rate in cycles
.tremolodepth(0.5)

// Phaser
.phaser(0.5)
```

### Orbit (FX Bus Grouping)
```javascript
// Different orbits have independent global effects
s("hh*8").delay(0.5).orbit(1)
s("pad").room(0.8).orbit(2)
s("bd").orbit(3)
```

---

## Modulation Sources

```javascript
// LFOs that can be used as parameter values
sine                    // sine wave LFO
square                  // square wave
saw                     // sawtooth
tri                     // triangle
perlin                  // smooth random

// Modify LFO
sine.slow(4)            // 4-cycle period
sine.range(200, 2000)   // rescale to Hz range
sine.slow(8).range(0.2, 0.8)

// Apply to parameter
.lpf(sine.slow(4).range(200, 2000))
.pan(sine.slow(2))
.gain(sine.range(0.5, 1))
```

---

## Pattern Syntax Sugar

```javascript
// $: prefix runs patterns in parallel (each gets its own label)
$: s("bd*4")
$: note("c2 ~ c2 ~").s("sine")

// Without $:, only the last expression runs
```

---

## Complete Working Example

```javascript
// Dark Techno sketch — 134 BPM
setcps(134/120)

$: stack(
  s("bd*4").bank("RolandTR909").gain(1),
  s("~ ~ sd ~").bank("RolandTR909").room(0.1),
  s("hh*8").bank("RolandTR909").gain(0.4).hpf(6000),
  s("oh(3,8)").bank("RolandTR909").gain(0.3).room(0.2)
)

$: note("<c1 ~ c1 ~ bb0 ~ c1 ~>")
  .s("sawtooth")
  .lpf(sine.slow(8).range(100, 800))
  .lpq(8)
  .gain(0.7)
  .attack(0.005)
  .release(0.1)

$: note("<[c3,eb3,g3]!2 [bb2,d3,f3]!2>")
  .s("sawtooth")
  .lpf(300)
  .attack(0.3)
  .release(1)
  .gain(0.25)
  .room(0.6)
  .roomsize(3)
  .slow(2)
```
