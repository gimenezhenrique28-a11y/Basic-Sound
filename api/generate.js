// ── Allowlists (injection hardening) ──────────────────────────────────────────
const ALLOWED_GENRES = ['','House','Techno','Drum & Bass','Jungle','Dubstep','UK Garage','Ambient','IDM','Acid','Footwork','Breaks','Hardstyle'];
const ALLOWED_SCALES = ['','minor','major','dorian','phrygian','minor pentatonic','chromatic'];
const ALLOWED_ROOTS  = ['','C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function sanitizeStr(val, maxLen = 300) {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<[^>]*>/g, '')
    .replace(/\[INST\]|\[\/INST\]/gi, '')
    .replace(/###\s*(system|instruction|prompt)/gi, '')
    .replace(/ignore previous instructions?/gi, '')
    .replace(/you are now|pretend (you are|to be)/gi, '')
    .slice(0, maxLen).trim();
}

function sanitizeNum(val, min, max, fallback) {
  const n = Number(val);
  return (!isFinite(n) || n < min || n > max) ? fallback : Math.round(n);
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch { return false; }
}

// ── Anthropic helper ──────────────────────────────────────────────────────────
async function callClaude(system, messages, maxTokens = 1024, model = 'claude-haiku-4-5-20251001', tools = null) {
  const body = { model, max_tokens: maxTokens, system, messages };
  if (tools) body.tools = tools;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'interleaved-thinking-2025-05-14'
    },
    body: JSON.stringify(body)
  });
  return r.json();
}

// ── Step 1: Research the track via web search ─────────────────────────────────
async function researchTrack(trackQuery) {
  // Use Sonnet for research — it handles tool use better; Haiku for codegen
  const RESEARCH_SYSTEM = `You are a music analyst. Given a track name or URL, use web_search to find:
- Exact BPM
- Musical key and scale
- Chord progression (e.g. "Am - F - C - G")
- Bassline notes and rhythm (e.g. "A1 quarter, C2 eighth...")
- Drum machine used (808/909/live/etc)
- Drum pattern description (kick/snare/hat placement)
- Synth/instrument timbres (e.g. "detuned saw bass", "plucky lead")
- Genre and sub-genre
- General mood and energy

Search multiple angles: "[artist track] BPM key", "[artist track] chord progression", "[artist track] music theory analysis".
After searching, output ONLY a compact JSON — no markdown:
{"bpm":N,"key":"A minor","chords":"Am-F-C-G","bassline":"a1 ~ c2 ~ e2 ~ g1 ~","bassNotes":"A1 C2 E2 G1","drumMachine":"RolandTR909","kickPattern":"bd ~ bd bd ~ bd ~ ~","snarePattern":"~ ~ sd ~ ~ ~ sd ~","hatPattern":"hh*8","synths":["detuned sawtooth bass","bright square lead","pad chord"],"genre":"Techno","mood":"dark hypnotic","energy":"high"}`;

  const messages = [{ role: 'user', content: `Research this track for music analysis: ${trackQuery}` }];
  const tools = [{ type: 'web_search_20250305', name: 'web_search' }];

  // Use Sonnet for multi-turn tool use research
  let data = await callClaude(RESEARCH_SYSTEM, messages, 2000, 'claude-sonnet-4-5', tools);

  // Agentic loop — keep going until model stops using tools (max 4 rounds)
  let rounds = 0;
  const history = [...messages];
  while (data.stop_reason === 'tool_use' && rounds < 4) {
    rounds++;
    history.push({ role: 'assistant', content: data.content });
    const toolResults = data.content
      .filter(b => b.type === 'tool_use')
      .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(b.input) }));
    history.push({ role: 'user', content: toolResults });
    data = await callClaude(RESEARCH_SYSTEM, history, 2000, 'claude-sonnet-4-5', tools);
  }

  // Extract JSON from final text response
  const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// ── Step 2: Build user message for codegen ────────────────────────────────────
function buildCodegenMessage(fields, trackInfo) {
  const { prompt, genre, bpm, keyRoot, keyScale, analysis } = fields;
  const parts = [];

  if (trackInfo) {
    // Rich researched data — most valuable signal
    parts.push(`TRACK RESEARCH:
bpm=${trackInfo.bpm} key="${trackInfo.key}" chords="${trackInfo.chords||'unknown'}"
bassline="${trackInfo.bassline||''}" bassNotes="${trackInfo.bassNotes||''}"
kick="${trackInfo.kickPattern||''}" snare="${trackInfo.snarePattern||''}" hats="${trackInfo.hatPattern||''}"
drumMachine="${trackInfo.drumMachine||'RolandTR909'}" synths="${(trackInfo.synths||[]).join(', ')}"
genre="${trackInfo.genre||genre}" mood="${trackInfo.mood||''}" energy="${trackInfo.energy||''}"`.trim());
  }

  if (analysis) {
    parts.push(`AUDIO ANALYSIS: bpm=${analysis.bpm} key=${analysis.key} beats=${analysis.beatPattern} bass=${analysis.bassContour} energy=${analysis.energy}`);
  }

  if (prompt)  parts.push(`VIBE: ${prompt}`);
  if (genre && !trackInfo)   parts.push(`GENRE: ${genre}`);
  if (bpm && !trackInfo)     parts.push(`BPM: ${bpm}`);
  if (keyRoot) parts.push(`KEY: ${keyRoot}${keyScale ? ' ' + keyScale : ''}`);

  parts.push('Output JSON only.');
  return parts.join('\n');
}

// ── Codegen system prompt (lean) ──────────────────────────────────────────────
const CODEGEN_SYSTEM = `You are a Strudel.cc live coder. Output only valid JSON, no markdown.

Rules:
- setcps(BPM/120) first
- 5 layers: $: drums(stack), $: perc, $: bass, $: lead, $: pad
- Use EXACT notes from bassline/chord data when provided
- Patterns in double quotes. Note names lowercase. .bank("RolandTR808") or .bank("RolandTR909")
- Effects chained: .lpf(n).room(n).gain(n)
- Scale: n("0 2 4").scale("A4:minor")
- Escape as JSON string: \\n for newlines, \\" for inner quotes

Return: {"genre":"...","bpm":N,"key":"...","mood":"...","code":"..."}`;

// ── Main handler ──────────────────────────────────────────────────────────────
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

    // Sanitize
    const prompt   = sanitizeStr(body.prompt, 300);
    const genre    = ALLOWED_GENRES.includes(body.genre) ? body.genre : '';
    const bpm      = sanitizeNum(body.bpm, 60, 200, 128);
    const keyRoot  = ALLOWED_ROOTS.includes(body.keyRoot) ? body.keyRoot : '';
    const keyScale = ALLOWED_SCALES.includes(body.keyScale) ? body.keyScale : '';
    const refUrl   = (typeof body.refUrl === 'string' && isValidUrl(body.refUrl))
                     ? body.refUrl.slice(0, 200) : '';

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

    if (!prompt && !genre && !analysis && !refUrl) {
      return res.status(400).json({ error: { message: 'No valid input provided' } });
    }

    // ── Step 1: research track if URL or named track in prompt ──
    let trackInfo = null;
    const trackQuery = refUrl || (prompt.length > 3 ? prompt : null);
    if (trackQuery) {
      try { trackInfo = await researchTrack(trackQuery); } catch(e) { /* continue without */ }
    }

    // ── Step 2: generate Strudel code with all context ──
    const userMsg = buildCodegenMessage({ prompt, genre, bpm, keyRoot, keyScale, analysis }, trackInfo);
    const codeData = await callClaude(CODEGEN_SYSTEM, [{ role: 'user', content: userMsg }], 1024);

    // Return final response with research metadata attached
    codeData._trackInfo = trackInfo; // pass back to client for display
    res.status(200).json(codeData);

  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}
