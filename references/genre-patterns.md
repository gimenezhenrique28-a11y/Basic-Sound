# Genre Pattern Templates for Strudel

Complete, runnable templates for major electronic music genres.
Adapt these by changing: BPM, key/notes, synth choices, and effect amounts.

---

## House (120–130 BPM)

```javascript
// Deep House — 124 BPM
setcps(124/120)

$: stack(
  s("bd*4").bank("RolandTR909").gain(1),
  s("~ ~ sd ~").bank("RolandTR909").room(0.15).gain(0.85),
  s("[hh hh:1]*4").bank("RolandTR909").gain(0.35).hpf(5000),
  s("oh(2,8,1)").bank("RolandTR909").gain(0.25).room(0.2)
)

// Deep sub bass locked to kick
$: note("c1 ~ c1 ~ c1 ~ c1 ~")
  .s("sine")
  .gain(0.85)
  .lpf(90)
  .attack(0.005)
  .release(0.25)

// Chord stabs (off-beat, typical house)
$: note("<[eb3,g3,bb3] ~ [eb3,g3,bb3] ~>")
  .s("sawtooth")
  .lpf(700)
  .attack(0.01)
  .decay(0.2)
  .sustain(0)
  .release(0.15)
  .gain(0.4)
  .room(0.3)

// Rolling bassline
$: note("[c2 ~ [c2 ~] eb2] [g1 ~ bb1 ~]")
  .s("sawtooth")
  .lpf(400)
  .lpq(4)
  .attack(0.005)
  .release(0.12)
  .gain(0.6)
```

---

## Techno (133–145 BPM)

```javascript
// Dark Techno — 135 BPM
setcps(135/120)

$: stack(
  s("bd*4").bank("RolandTR909").gain(1.1),
  s("~ ~ sd ~").bank("RolandTR909").gain(0.8).room(0.1),
  s("[~ hh]*4").bank("RolandTR909").gain(0.3).hpf(7000),
  s("oh(3,8)").bank("RolandTR909").gain(0.2).room(0.2),
  s("cp(1,8,4)").bank("RolandTR909").gain(0.4).room(0.05)
)

// Industrial bass
$: note("<c1!3 [c1 bb0]>")
  .s("sawtooth")
  .lpf(200)
  .lpq(5)
  .gain(0.8)
  .attack(0.003)
  .decay(0.15)
  .sustain(0.2)
  .release(0.1)
  .distort(0.5)

// Sweep pad
$: note("<[c2,g2]!2 [bb1,f2]!2>")
  .s("sawtooth")
  .lpf(sine.slow(16).range(150, 1200))
  .lpq(6)
  .gain(0.25)
  .attack(0.5)
  .release(3)
  .room(0.7)
  .roomsize(4)
  .slow(2)

// Acid line (every 2 cycles)
$: note("<c2 ~ eb2 ~ bb1 ~ c2 ~>")
  .s("sawtooth")
  .lpf(sine.slow(4).range(200, 4000))
  .lpq(25)
  .gain(0.5)
  .attack(0.005)
  .decay(0.1)
  .sustain(0.3)
  .release(0.08)
```

---

## Drum & Bass (160–175 BPM)

```javascript
// Liquid DnB — 170 BPM
setcps(170/120)

$: stack(
  // Two-step / jungle-ish kick
  s("bd ~ ~ ~ ~ bd ~ ~").bank("RolandTR909").gain(1),
  // Snare on 3 with ghost notes
  s("[~ ~ sd ~] [~ ~ [~ sd] ~]").bank("RolandTR909").gain(0.85),
  // Fast hi-hats
  s("hh*16").bank("RolandTR909").gain(0.25).hpf(8000).degradeBy(0.1),
  // Open hat
  s("~ oh ~ ~ ~ oh ~ ~").bank("RolandTR909").gain(0.35).room(0.15)
)

// Rolling sub bass
$: note("<c1!3 bb0> <eb1!3 c1>")
  .s("sine")
  .gain(0.9)
  .lpf(100)
  .attack(0.005)
  .release(0.12)
  .slow(2)

// Mid bass / Reese bass
$: note("<c2!2 eb2!2 bb1!4>")
  .s("sawtooth")
  .lpf(800)
  .lpq(3)
  .gain(0.45)
  .attack(0.01)
  .release(0.5)
  .detune(0.05)

// Liquid melody
$: n("<0 3 5 7 5 3 0 ~>").scale("C:minor")
  .s("sine")
  .gain(0.5)
  .attack(0.01)
  .release(0.3)
  .room(0.4)
  .slow(2)
```

---

## Dubstep / Brostep (138–142 BPM, half-time feel)

```javascript
// Dubstep — 140 BPM (half-time: snare on beat 3 of 8)
setcps(140/120)

$: stack(
  // Half-time kick
  s("bd ~ ~ ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.1),
  // Heavy snare on beat 3
  s("~ ~ ~ ~ sd ~ ~ ~").bank("RolandTR909").gain(1).room(0.2),
  // 16th note hats
  s("hh*16").gain(0.2).hpf(7000).degradeBy(0.2),
  // Clap
  s("~ ~ ~ ~ cp ~ ~ ~").gain(0.6)
)

// Sub bass
$: note("c1 ~ ~ ~ ~ ~ c1 ~")
  .s("sine")
  .gain(1)
  .lpf(80)
  .attack(0.005)
  .release(0.5)

// Wobble bass (LFO on filter = "wob")
$: note("c2 ~ ~ ~ c2 ~ ~ ~")
  .s("sawtooth")
  .lpf(sine.fast(2).range(150, 3000))  // fast(2) = twice per cycle
  .lpq(15)
  .gain(0.7)
  .attack(0.01)
  .release(0.3)
  .distort(1)
```

---

## UK Garage / Speed Garage (130–136 BPM)

```javascript
// UKG — 132 BPM
setcps(132/120)

$: stack(
  s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR909").gain(1),
  // 2-step shuffle
  s("~ ~ sd ~ ~ ~ sd ~").bank("RolandTR909").gain(0.8).room(0.1),
  // Swung hats — use swing
  s("hh*8").swing(0.6).bank("RolandTR909").gain(0.3).hpf(6000),
  s("oh ~ ~ oh ~ ~ ~ ~").bank("RolandTR909").gain(0.3).room(0.2)
)

// Skippy bass
$: note("[c2 ~ ~ c2 ~ [c2 eb2]] [g1 ~ ~ ~ ~ ~ ~ ~]")
  .s("sawtooth")
  .lpf(500)
  .attack(0.005)
  .decay(0.1)
  .sustain(0)
  .release(0.08)
  .gain(0.65)

// Vocal-chop style (use vowel filter as substitute)
$: note("[c4 ~ c4 ~] [eb4 ~ ~ ~]")
  .s("sawtooth")
  .vowel("<a e i o>")
  .gain(0.35)
  .room(0.3)
```

---

## Ambient / Atmospheric (60–90 BPM)

```javascript
// Dark Ambient — 75 BPM
setcps(75/120)

// Sparse, occasional hi-hat texture
$: s("hh(3,16)").gain(0.15).room(0.9).roomsize(8).hpf(8000)

// Slow pad drone
$: note("<[c3,eb3,g3,bb3] [ab2,c3,eb3,g3]>")
  .s("sawtooth")
  .lpf(400)
  .attack(3)
  .release(6)
  .gain(0.2)
  .room(0.9)
  .roomsize(8)
  .slow(4)

// Deep sub drone
$: note("c1")
  .s("sine")
  .gain(0.4)
  .lpf(60)
  .attack(4)
  .release(8)
  .slow(4)

// Texture layer
$: note("c5 ~ ~ eb5 ~ ~ ~ g5")
  .s("sine")
  .gain(0.15)
  .room(0.95)
  .roomsize(10)
  .delay(0.7)
  .delaytime(0.5)
  .delayfeedback(0.8)
  .lpf(1500)
  .slow(3)
```

---

## Jungle (165–175 BPM)

```javascript
// Jungle — 172 BPM
setcps(172/120)

// Chopped amen-style break (using euclidean rhythms to approximate)
$: stack(
  s("bd(3,8)").bank("RolandTR808").gain(1),
  s("sd(2,8,2)").gain(0.8),
  s("hh*16").gain(0.2).degradeBy(0.2).hpf(8000),
  s("oh(3,8,1)").gain(0.25).room(0.1)
)

// Reggae-inspired rolling bass
$: note("[c1 ~ [~ c1] ~] [bb0 ~ ~ ~]")
  .s("sine")
  .gain(0.9)
  .lpf(90)
  .attack(0.003)
  .release(0.2)

// Stab chord
$: note("<[c3,eb3] ~ ~ ~ [bb2,d3] ~ ~ ~>")
  .s("sawtooth")
  .attack(0.005)
  .decay(0.1)
  .sustain(0)
  .release(0.1)
  .gain(0.35)
  .lpf(1500)
  .room(0.2)
```

---

## IDM / Glitch (Variable BPM)

```javascript
// IDM — 120 BPM with complex rhythms
setcps(1)

// Glitchy drums
$: stack(
  s("bd(5,16)").bank("RolandTR909").gain(0.9),
  s("sd(3,16,3)").gain(0.7),
  s("hh*16").degradeBy(0.4).gain(0.2),
  s("cp(7,16,2)").gain(0.3).crush(6)
)

// Detuned melodic fragment
$: n(run(8)).scale("C:phrygian")
  .s("sawtooth")
  .fast(3)
  .lpf(1200)
  .crush(10)
  .gain(0.4)
  .room(0.3)
  .sometimes(x => x.rev())

// Evolving texture
$: note("<c3 eb3 g3 bb3>")
  .s("sine")
  .fm(perlin.slow(4).range(1, 8))
  .gain(0.3)
  .lpf(sine.slow(3).range(400, 3000))
  .room(0.5)
  .slow(2)
```

---

## Trance (138–145 BPM)

```javascript
// Trance — 140 BPM
setcps(140/120)

$: stack(
  s("bd*4").bank("RolandTR909").gain(1.1),
  s("~ ~ sd ~").bank("RolandTR909").gain(0.8),
  s("hh*16").gain(0.2).hpf(8000),
  s("oh(2,8,1)").gain(0.2).room(0.15)
)

// Pumping supersaw pad (the trance sound)
$: note("<[c3,g3,bb3,eb4]!4 [bb2,f3,ab3,d4]!4>")
  .s("sawtooth")
  .lpf(sine.slow(16).range(400, 4000))
  .lpq(3)
  .attack(0.01)
  .release(0.8)
  .gain(0.35)
  .room(0.4)
  .slow(2)

// Arpeggiated lead
$: n("0 4 7 11 7 4 0 ~").scale("C:minor")
  .s("sawtooth")
  .lpf(2500)
  .attack(0.005)
  .release(0.12)
  .gain(0.5)
  .fast(2)
  .room(0.3)
  .delay(0.4)
  .delaytime(0.375)  // dotted 8th at 140 BPM
  .delayfeedback(0.5)

// Bassline
$: note("<c2!2 bb1!2>")
  .s("sawtooth")
  .lpf(300)
  .attack(0.005)
  .release(0.2)
  .gain(0.65)
```
