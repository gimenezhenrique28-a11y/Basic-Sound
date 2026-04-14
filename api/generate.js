// Allowed field shapes — anything outside these is dropped
const ALLOWED_GENRES = ['','House','Techno','Drum & Bass','Jungle','Dubstep','UK Garage','Ambient','IDM','Acid','Footwork','Breaks','Hardstyle'];
const ALLOWED_SCALES = ['','minor','major','dorian','phrygian','minor pentatonic','chromatic'];
const ALLOWED_ROOTS  = ['','C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function sanitizeStr(val, maxLen = 200) {
  if (typeof val !== 'string') return '';
  // strip anything that looks like a prompt injection attempt
  return val
    .replace(/<[^>]*>/g, '')           // no HTML/XML tags
    .replace(/\[INST\]|\[\/INST\]/gi, '')
    .replace(/###\s*(system|instruction|prompt)/gi, '')
    .replace(/ignore previous instructions?/gi, '')
    .replace(/you are now|pretend (you are|to be)/gi, '')
    .slice(0, maxLen)
    .trim();
}

function sanitizeNum(val, min, max, fallback) {
  const n = Number(val);
  if (!isFinite(n) || n < min || n > max) return fallback;
  return Math.round(n);
}

function buildUserMessage(fields) {
  const { prompt, genre, bpm, keyRoot, keyScale, analysis } = fields;
  const parts = [];

  if (analysis) {
    // structured audio analysis — most valuable signal, goes first
    parts.push(`AUDIO ANALYSIS: bpm=${analysis.bpm} key=${analysis.key} beats=${analysis.beatPattern} bass=${analysis.bassContour} energy=${analysis.energy}`);
  }
  if (prompt)   parts.push(`VIBE: ${prompt}`);
  if (genre)    parts.push(`GENRE: ${genre}`);
  if (bpm)      parts.push(`BPM: ${bpm}`);
  if (keyRoot)  parts.push(`KEY: ${keyRoot}${keyScale ? ' ' + keyScale : ''}`);

  parts.push('Output JSON only.');
  return parts.join('\n');
}

const SYSTEM = `You are a Strudel.cc live coder. Output only valid JSON, no markdown.

Rules:
- setcps(BPM/120) first
- 5 layers: $: drums(stack), $: perc, $: bass, $: lead, $: pad
- Patterns in double quotes. Note names lowercase. .bank("RolandTR808") or .bank("RolandTR909")
- Effects chained: .lpf(n).room(n).gain(n)
- Scale: n("0 2 4").scale("A4:minor")
- Escape code as JSON string: \\n for newlines, \\" for quotes inside patterns

Return: {"genre":"...","bpm":N,"key":"...","mood":"...","code":"..."}`;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const body = req.body || {};

    // --- SANITIZE ALL INPUTS ---
    const prompt   = sanitizeStr(body.prompt, 300);
    const genre    = ALLOWED_GENRES.includes(body.genre) ? body.genre : '';
    const bpm      = sanitizeNum(body.bpm, 60, 200, 128);
    const keyRoot  = ALLOWED_ROOTS.includes(body.keyRoot) ? body.keyRoot : '';
    const keyScale = ALLOWED_SCALES.includes(body.keyScale) ? body.keyScale : '';

    // audio analysis object — only accept known numeric/string fields
    let analysis = null;
    if (body.analysis && typeof body.analysis === 'object') {
      analysis = {
        bpm:         sanitizeNum(body.analysis.bpm, 40, 220, bpm),
        key:         sanitizeStr(body.analysis.key, 20),
        beatPattern: sanitizeStr(body.analysis.beatPattern, 80),
        bassContour: sanitizeStr(body.analysis.bassContour, 80),
        energy:      sanitizeStr(body.analysis.energy, 20),
      };
    }

    if (!prompt && !genre && !analysis) {
      return res.status(400).json({ error: { message: 'No valid input provided' } });
    }

    const userMsg = buildUserMessage({ prompt, genre, bpm, keyRoot, keyScale, analysis });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // lean model — fast + cheap for structured output
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}
