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
  try { const u = new URL(str); return u.protocol==='https:'||u.protocol==='http:'; }
  catch { return false; }
}

// Strip any HTML/span artifacts the model might have hallucinated into code
function sanitizeCode(code) {
  if (typeof code !== 'string') return '';
  return code
    .replace(/"tok-[^"]*">/g, '')   // "tok-fn"> etc
    .replace(/<\/span>/g, '')
    .replace(/<span[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

async function callClaude(system, messages, maxTokens, model, tools) {
  const body = { model, max_tokens: maxTokens, system, messages };
  if (tools) body.tools = tools;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function researchTrack(trackQuery) {
  const RESEARCH_SYSTEM = `You are a music analyst. Search for musical details about a track.
Use web_search to find: BPM, key/scale, chord progression, bassline notes, drum machine model, kick/snare/hat patterns, synth descriptions, genre, mood.
Search queries like: "[artist] [track] BPM key", "[artist] [track] chord progression", "[artist] [track] music theory".
After searching output ONLY compact JSON, no markdown:
{"bpm":N,"key":"A minor","chords":"Am-F-C-G","bassline":"a1 ~ c2 ~ e2 ~","drumMachine":"RolandTR909","kickPattern":"bd ~ bd ~","snarePattern":"~ sd ~ sd","hatPattern":"hh*8","synths":["detuned saw","square lead"],"genre":"Techno","mood":"dark","energy":"high"}`;

  const messages = [{ role:'user', content:`Research track: ${trackQuery}` }];
  const tools = [{ type:'web_search_20250305', name:'web_search' }];
  let data = await callClaude(RESEARCH_SYSTEM, messages, 2000, 'claude-sonnet-4-5', tools);

  const history = [...messages];
  let rounds = 0;
  while (data.stop_reason === 'tool_use' && rounds < 4) {
    rounds++;
    history.push({ role:'assistant', content:data.content });
    const results = data.content.filter(b=>b.type==='tool_use').map(b=>({
      type:'tool_result', tool_use_id:b.id, content:JSON.stringify(b.input)
    }));
    history.push({ role:'user', content:results });
    data = await callClaude(RESEARCH_SYSTEM, history, 2000, 'claude-sonnet-4-5', tools);
  }

  const raw = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

const CODEGEN_SYSTEM = `You are a Strudel.cc pattern coder. Return ONLY valid JSON. No markdown, no explanation.

STRUDEL SYNTAX — the ONLY valid patterns:
  s("bd ~ sd ~").bank("RolandTR808")          // drums from sample bank
  note("c2 eb2 g2").s("sawtooth")             // melodic with synth
  n("0 2 4").scale("C4:minor").s("square")    // scale degrees
  stack(s("bd").bank("RolandTR909"), s("hh").bank("RolandTR909"))  // layer drums

FORBIDDEN — never use these:
  sound(...)        // WRONG — use s(...)
  .when(...)        // WRONG — does not exist in Strudel
  .layer(...)       // WRONG — use stack() instead
  .clip(...)        // WRONG
  .begin(...)       // WRONG
  .sustain(...)     // WRONG — use .legato() or .decay()
  CamelCase methods // WRONG — all methods lowercase

VALID EFFECTS (only these): .lpf(n) .hpf(n) .room(n) .gain(n) .delay(n) .speed(n) .fast(n) .slow(n) .rev() .every(n,x=>x) .degradeBy(n) .resonance(n) .bank("...")

STRUCTURE (exactly 5 $: lines after setcps):
setcps(BPM/120)
$: stack(s("bd ~ bd ~").bank("RolandTR909"),s("~ sd ~ sd").bank("RolandTR909"),s("hh*8").gain(0.5).bank("RolandTR909"))
$: s("cp ~ ~ ~").bank("RolandTR808").room(0.4).gain(0.4)
$: note("c2 ~ eb2 ~ g2 ~").s("sawtooth").lpf(600).gain(0.8)
$: n("0 ~ 4 5 ~ 7").scale("C4:minor").s("square").room(0.3).gain(0.5)
$: note("c4").s("triangle").lpf(800).room(0.7).gain(0.2).slow(2)

Use researched bassline notes and patterns when provided.
Escape code for JSON: \\n between lines, \\" for quotes inside pattern strings.

Return: {"genre":"...","bpm":N,"key":"...","mood":"...","code":"ESCAPED_STRUDEL_CODE"}`;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Access-Control-Allow-Origin','*');

  try {
    const body = req.body || {};
    const prompt   = sanitizeStr(body.prompt, 300);
    const genre    = ALLOWED_GENRES.includes(body.genre) ? body.genre : '';
    const bpm      = sanitizeNum(body.bpm, 60, 200, 128);
    const keyRoot  = ALLOWED_ROOTS.includes(body.keyRoot) ? body.keyRoot : '';
    const keyScale = ALLOWED_SCALES.includes(body.keyScale) ? body.keyScale : '';
    const refUrl   = (typeof body.refUrl==='string' && isValidUrl(body.refUrl)) ? body.refUrl.slice(0,200) : '';

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
      return res.status(400).json({ error:{ message:'No valid input provided' } });
    }

    // Stage 1: research
    let trackInfo = null;
    const trackQuery = refUrl || (prompt.length > 3 ? prompt : null);
    if (trackQuery) {
      try { trackInfo = await researchTrack(trackQuery); } catch(e) { /* continue */ }
    }

    // Stage 2: codegen — build lean message from sanitized data only
    const parts = [];
    if (trackInfo) {
      parts.push(`TRACK: bpm=${trackInfo.bpm} key="${trackInfo.key}" chords="${trackInfo.chords||''}" bassline="${trackInfo.bassline||''}" kick="${trackInfo.kickPattern||''}" snare="${trackInfo.snarePattern||''}" hats="${trackInfo.hatPattern||''}" drum="${trackInfo.drumMachine||'RolandTR909'}" synths="${(trackInfo.synths||[]).join(',')}" mood="${trackInfo.mood||''}" energy="${trackInfo.energy||''}"`)
    }
    if (analysis) parts.push(`AUDIO: bpm=${analysis.bpm} key=${analysis.key} beats=${analysis.beatPattern} energy=${analysis.energy}`);
    if (prompt)   parts.push(`VIBE: ${prompt}`);
    if (genre)    parts.push(`GENRE: ${genre}`);
    if (!trackInfo && bpm) parts.push(`BPM: ${bpm}`);
    if (keyRoot)  parts.push(`KEY: ${keyRoot}${keyScale?' '+keyScale:''}`);
    parts.push('Return JSON only.');

    const codeData = await callClaude(CODEGEN_SYSTEM, [{ role:'user', content:parts.join('\n') }], 1024, 'claude-haiku-4-5-20251001');

    // Sanitize code in response before sending to client
    if (codeData.content) {
      codeData.content = codeData.content.map(block => {
        if (block.type !== 'text') return block;
        try {
          const clean = block.text.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();
          const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)[0]);
          parsed.code = sanitizeCode(parsed.code);
          return { ...block, text: JSON.stringify(parsed) };
        } catch { return block; }
      });
    }

    codeData._trackInfo = trackInfo;
    res.status(200).json(codeData);
  } catch(err) {
    res.status(500).json({ error:{ message:err.message } });
  }
}
