# Strudel Sounds, Synths & Sample Banks Reference

## Synth Oscillators (use with `note()`)

```javascript
note("c3").s("sine")        // Pure sine wave — good for sub bass
note("c3").s("sawtooth")    // Bright, buzzy — classic synth lead/bass
note("c3").s("square")      // Hollow, woody sound
note("c3").s("triangle")    // Softer, flute-like

// Default (no .s()) uses triangle wave
note("c3")

// Noise oscillators
note("c3").s("white")       // White noise — hiss, sweeps
note("c3").s("pink")        // Softer noise
note("c3").s("brown")       // Warm, rumbling noise
```

## FM Synthesis

```javascript
note("c2").s("sine")
  .fm(3)              // FM index (higher = more harmonics)
  .fmh(2)             // Harmonicity ratio (integer = tonal, decimal = metallic)
  .fmattack(0.01)
  .fmdecay(0.3)
  .fmsustain(0.5)
```

## SuperSaw / Detuned Oscillators

```javascript
// Supersaw-style fat pads
note("c3").s("sawtooth")
  .detune(0.1)          // slight detuning for width
  .gain(0.4)
  .attack(0.3)
  .release(1.5)
  .lpf(800)
  .room(0.5)
```

---

## Drum Machine Sample Banks

Strudel includes classic drum machines via the `tidal-drum-machines` library. Use `.bank("BankName")` to select.

### Bank Names

| Bank | Machine |
|---|---|
| `RolandTR808` | Roland TR-808 |
| `RolandTR909` | Roland TR-909 |
| `RolandTR707` | Roland TR-707 |
| `RolandTR606` | Roland TR-606 |
| `LinnDrum` | Linn LM-1 |
| `AkaiXR10` | Akai XR-10 |
| `KorgKR55` | Korg KR-55 |
| `YamahaRX5` | Yamaha RX5 |
| `E-mu_Drumulator` | E-mu Drumulator |

### Standard Sample Names (work with most banks)

| Name | Sound |
|---|---|
| `bd` | Bass drum / kick |
| `sd` | Snare drum |
| `hh` | Closed hi-hat |
| `oh` | Open hi-hat |
| `cp` | Clap |
| `rim` | Rimshot |
| `cr` | Crash cymbal |
| `rd` | Ride cymbal |
| `ht` | High tom |
| `mt` | Mid tom |
| `lt` | Low tom |
| `cb` | Cowbell |
| `sh` | Shaker |
| `tb` | Tambourine |
| `perc` | Other percussion |

### Bank-Specific Usage

```javascript
// TR-808 kick with pitch
s("bd").bank("RolandTR808").speed(0.8)   // deeper pitch

// TR-909 kick (punchier)
s("bd").bank("RolandTR909")

// Mix banks in one pattern
stack(
  s("bd").bank("RolandTR808"),           // 808 kick
  s("sd").bank("RolandTR909"),           // 909 snare
  s("hh*8").bank("RolandTR707")          // 707 hats
)

// Selecting sample variants with n() or colon syntax
s("hh*8").n("0 1 0 1 0 2 0 1").bank("RolandTR909")
s("hh:0 hh:1 hh:2 hh:3").bank("RolandTR909")
```

---

## General Sample Names (built-in Strudel samples)

These are available without specifying a bank:

### Drums & Percussion
```
bd, sd, hh, oh, cp, rim, cr, rd, ht, mt, lt, cb, sh, perc
```

### Bass & Low End
```
bass, bass0, bass1, bass2, bass3, bassdm, bassfoo
```

### Melodic / Tonal
```
piano, gtr, flute, sax, trumpet, violin, cello
```

### Textures / Fx
```
breath, click, clop, crow, diphone, diphone2, east, foo
```

### Vintage / Electronic
```
amencutup, amen, breaks125, breaks152, breaks157, breaks165
```

---

## Choosing the Right Sound for a Part

### Sub Bass / Deep Bass
```javascript
note("c1 ~ ~ c1 ~ ~ eb1 ~")
  .s("sine")
  .gain(0.9)
  .lpf(100)
  .attack(0.005)
  .release(0.3)
```

### Plucky Synth Bass
```javascript
note("c2 ~ c2 [eb2 g2] ~ c2 ~ ~")
  .s("sawtooth")
  .lpf(400)
  .lpq(6)
  .attack(0.005)
  .decay(0.15)
  .sustain(0)
  .release(0.1)
```

### Pad / Chord Sustain
```javascript
note("<[c3,eb3,g3]!2 [g2,bb2,d3]!2>")
  .s("sawtooth")
  .lpf(600)
  .attack(0.5)
  .release(2)
  .gain(0.3)
  .room(0.7)
  .roomsize(4)
```

### Lead Synth
```javascript
note("c4 ~ eb4 f4 ~ g4 ~ ~")
  .s("sawtooth")
  .lpf(2000)
  .lpq(3)
  .attack(0.01)
  .release(0.2)
  .gain(0.6)
```

### Arpeggio
```javascript
n("0 2 4 7 9 7 4 2").scale("C:minor")
  .s("square")
  .lpf(1200)
  .fast(2)
  .attack(0.001)
  .release(0.08)
  .gain(0.5)
```

### Acid Bass (TB-303 style)
```javascript
note("<c2!3 eb2> <bb1!2 c2!2>")
  .s("sawtooth")
  .lpf(sine.slow(4).range(200, 3000))
  .lpq(20)
  .attack(0.005)
  .decay(0.2)
  .sustain(0.3)
  .release(0.1)
  .gain(0.7)
```

### Supersaw Lead/Pad
```javascript
note("<c4 eb4 g4 bb4>")
  .s("sawtooth")
  .fast(0.5)
  .attack(0.01)
  .release(0.5)
  .gain(0.35)
  .lpf(3000)
  .room(0.4)
  .pan(sine.slow(3).range(0.3, 0.7))
```

---

## Wavetable Synthesis (AKWF)

Access waveforms from the Adventure Kid waveform library:

```javascript
note("c3").s("wt_oboe")
note("c3").s("wt_violin")
note("c3").s("wt_fm")
note("c3").s("wt_pulse")
```

---

## Tips for Sample Selection

1. **For house/techno kicks**: TR-808 or TR-909. 808 is longer/booming, 909 is punchier/tighter.
2. **For jungle/DnB**: Use `amen` break samples and chop them with fast/slice patterns.
3. **For lo-fi**: Use `.crush(6).room(0.3)` on any sample.
4. **For sub bass in electronic music**: `s("sine")` with very low note + `.lpf(80)`.
5. **For acid**: `s("sawtooth")` + high resonance `.lpq(20-30)` + animated `.lpf()`.
6. **For pads**: `s("sawtooth")` with slow `.attack(0.3-1)`, `.release(1-3)`, `.room(0.5-0.8)`.
