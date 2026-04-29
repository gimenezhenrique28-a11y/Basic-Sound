const ALLOWED_GENRES = ['','House','Techno','Drum & Bass','Jungle','Dubstep','UK Garage','Ambient','IDM','Acid','Footwork','Breaks','Hardstyle'];
const ALLOWED_SCALES = ['','minor','major','dorian','phrygian','minor pentatonic','chromatic'];
const ALLOWED_ROOTS  = ['','C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const sanitizeStr = (v, n=300) => typeof v!=='string' ? '' : v
  .replace(/<[^>]*>/g,'').replace(/\[INST\]|\[\/INST\]/gi,'')
  .replace(/###\s*(system|instruction|prompt)/gi,'')
  .replace(/ignore previous instructions?/gi,'')
  .replace(/you are now|pretend (you are|to be)/gi,'')
  .slice(0,n).trim();

const sanitizeNum = (v,mn,mx,fb) => { const n=Number(v); return(!isFinite(n)||n<mn||n>mx)?fb:Math.round(n); };
const isValidUrl  = s => { try{const u=new URL(s);return u.protocol==='https:'||u.protocol==='http:';}catch{return false;} };

const sanitizeCode = c => typeof c!=='string' ? '' : c
  .replace(/"tok-[^"]*">/g,'').replace(/<\/span>/g,'').replace(/<span[^>]*>/g,'')
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();

function validateCode(code) {
  if (!code || typeof code !== 'string') return false;
  // must start with setcps
  if (!code.trim().startsWith('setcps(')) return false;
  // must have at least one $: line
  if (!code.includes('$:')) return false;
  // reject pipe-stack syntax
  if (/^\s*\|/m.test(code)) return false;
  // reject sound() calls
  if (/\bsound\s*\(/.test(code)) return false;
  // reject .when( .layer( .clip( .begin(
  if (/\.(when|layer|clip|begin)\s*\(/.test(code)) return false;
  return true;
}

const callClaude = async (system, messages, maxTokens=1500, model='claude-haiku-4-5-20251001', tools=null) => {
  const body = { model, max_tokens:maxTokens, system, messages };
  if (tools) body.tools = tools;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify(body)
  });
  return r.json();
};

// Research only runs when a URL or explicit track name is given — skip for vibe prompts
async function researchTrack(query) {
  const SYS = `Music analyst. ONE web_search for: BPM, key, chords, bassline, drum machine, kick/snare/hat, synths, genre, mood.
After search output ONLY JSON: {"bpm":N,"key":"A minor","chords":"Am-F","bassline":"a1 ~ c2","drumMachine":"RolandTR909","kickPattern":"bd ~ bd ~","snarePattern":"~ sd ~ sd","hatPattern":"hh*8","synths":["saw"],"genre":"Techno","mood":"dark","energy":"high"}`;
  const msgs = [{role:'user',content:`Track: ${query}`}];
  const tools = [{type:'web_search_20250305',name:'web_search'}];
  const timeout = new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),7000));
  const work = (async()=>{
    let d = await callClaude(SYS, msgs, 800, 'claude-haiku-4-5-20251001', tools);
    if (d.stop_reason==='tool_use') {
      const h=[...msgs,{role:'assistant',content:d.content}];
      const tr=d.content.filter(b=>b.type==='tool_use').map(b=>({type:'tool_result',tool_use_id:b.id,content:JSON.stringify(b.input)}));
      h.push({role:'user',content:tr});
      d = await callClaude(SYS, h, 800, 'claude-haiku-4-5-20251001', tools);
    }
    const raw=(d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim();
    const m=raw.match(/\{[\s\S]*\}/); if(!m) return null;
    try{return JSON.parse(m[0]);}catch{return null;}
  })();
  try{return await Promise.race([work,timeout]);}catch{return null;}
}

const GENRE_RULES = {
  'Techno':
    'BPM 133-145. Kick: bd*4 TR909 gain 1.1. Bassline: SINGLE ROOT NOTE repeated — "c1 ~ c1 ~ c1 ~ c1 ~" or "c1 ~ ~ ~ c1 ~ ~ ~", sawtooth or square, lpf 200-500 resonance 4-8, distort 0.4-0.8, NO chord movement. Layer 3: dark swept pad — note("c2") whole notes sawtooth lpf(sine.slow(16).range(150,1200)) attack 0.5 release 3 room 0.7. Layer 4: acid accent line — "c2 ~ eb2 ~ c2 ~ bb1 ~" sawtooth lpf resonance 20. Layer 5: percussive tops — cp or ride. Minimal, mechanical, NO melody.',
  'House':
    'BPM 120-128. Kick: bd*4 TR909. Off-beat open hat oh(2,8,1). Bassline: root+fifth — "c2 ~ g1 ~ c2 ~ g1 ~" sine or sawtooth lpf 400. Chord stab off-beat: note("<[c3,eb3,g3] ~ [c3,eb3,g3] ~>") sawtooth lpf 700 short attack. Layer 4: piano or Rhodes stab — note staccato. Layer 5: warm pad. Warm, soulful.',
  'Drum & Bass':
    'BPM 160-175. Kick: 2-step "bd ~ ~ ~ ~ bd ~ ~" TR909. Snare: "[~ ~ sd ~] [~ ~ [~ sd] ~]" ghost hits. Hats: hh*16 degradeBy 0.1. Bassline: rolling — "[c1 ~ [~ c1] ~] [bb0 ~ ~ ~]" sine. Layer 4: Reese bass — sawtooth lpf 800 detune 0.05. Layer 5: liquid pad or arp. Fast, rolling.',
  'Jungle':
    'BPM 165-175. Kick: bd(3,8) TR808. Snare: sd(2,8,2). Hats: hh*16 degradeBy 0.2. Bassline: reggae — "[c1 ~ [~ c1] ~] [bb0 ~ ~ ~]" sine lpf 90. Layer 4: stab "<[c3,eb3] ~ ~ ~ [bb2,d3] ~ ~ ~>" sawtooth short. Layer 5: texture. Chopped, hectic.',
  'Dubstep':
    'BPM 138-142 HALF-TIME. Kick: half-time "bd ~ ~ ~ ~ ~ ~ ~" TR808 gain 1.1. Snare ONLY beat 3: "~ ~ ~ ~ sd ~ ~ ~" TR909. Sub: "c1 ~ ~ ~ ~ ~ c1 ~" sine lpf 80. Wob bass: "c2 ~ ~ ~ c2 ~ ~ ~" sawtooth lpf(sine.fast(2).range(150,3000)) resonance 15 distort 1. Layer 5: atmosphere. HEAVY, half-time.',
  'UK Garage':
    'BPM 130-136. Kick: 2-step "bd ~ ~ bd ~ ~ bd ~" TR909. Snare: "~ ~ sd ~ ~ ~ sd ~". Hats: hh*8 swing(0.6). Bassline: skippy "[c2 ~ ~ c2 ~ [c2 eb2]] [g1 ~ ~ ~ ~ ~ ~ ~]" sawtooth lpf 500 short decay. Layer 4: vowel filter stab. Layer 5: pad. Skippy, swung.',
  'Ambient':
    'BPM 60-90. NO kick. Sparse hats hh(3,16) gain 0.15 room 0.9. Drone: note("c1") sine lpf 60 attack 4 release 8 slow 4. Slow pad: note("<[c3,eb3,g3,bb3] [ab2,c3,eb3,g3]>") sawtooth lpf 400 attack 3 release 6 room 0.9 slow 4. Layer 4: sparse high notes room 0.95 delay 0.7. Layer 5: sub drone. Spacious, use .slow(3) or .slow(4).',
  'IDM':
    'BPM 100-140 irregular. Kick: bd(5,16) TR909. Hats: hh*16 degradeBy 0.4 crush 6. Bassline: n(run(8)).scale("C:phrygian") sawtooth fast(3) crush 10. Layer 4: sometimes(x=>x.rev()) or every(3,x=>x.fast(2)). Layer 5: sine fm(perlin.slow(4).range(1,8)) room 0.5. Glitchy, complex.',
  'Acid':
    'BPM 130-145. Kick: bd*4 TR909. ACID BASSLINE is the star: "c2 ~ ~ c2 ~ ~ eb2 ~" sawtooth lpf(sine.slow(2).range(200,4000)) resonance 25 gain 0.7 — squirly filter sweep IS the sound. Second acid layer slightly transposed. Layer 4: minimal dark pad. Layer 5: cp or perc tops. Resonant, filter-heavy.',
  'Footwork':
    'BPM 155-165. Kick: rapid "[bd bd] ~ bd ~ [bd ~] bd ~ ~" TR909. Snare: sd(5,16). Hats: hh*16 degradeBy 0.15. Bassline: punchy short "c1 ~ eb1 ~ ~ c1 ~ ~" sine attack 0.001 release 0.1. Layer 4: percussive stab. Layer 5: pad. Fast, syncopated.',
  'Breaks':
    'BPM 130-145. Kick: BROKEN "bd ~ ~ bd [~ bd] ~ ~ ~" TR909. Snare: sd beat 2 with variations. Hats: hh*8 degradeBy 0.1. Bassline: funky "[c2 ~ eb2 ~] [g1 ~ ~ ~]" sawtooth lpf 600. Layer 4: off-beat chord stab. Layer 5: Rhodes or organ. Funky, bouncy.',
  'Hardstyle':
    'BPM 145-160. Kick: bd*4 TR909 distort 1.5 gain 1.2 — hard and distorted. Snare: "~ ~ sd ~" room 0.4 gain 1. Bassline: pumping "c1 ~ c1 ~ c1 ~ c1 ~" sawtooth lpf 400 distort 0.8. Layer 4: euphoric lead "n(\\"0 ~ 4 ~ 7 ~ 4 ~\\").scale(\\"C:minor\\")" sawtooth lpf 3000. Layer 5: swept synth pad. Hard, euphoric.',
};

// Minimal codegen prompt — examples cut to one, effects list trimmed
const CODEGEN = `Strudel.cc coder. Return ONLY JSON, no markdown.

CORRECT syntax only:
$: stack(s("bd ~ bd ~").bank("RolandTR909"),s("~ sd ~ sd").bank("RolandTR909"),s("hh*8").gain(0.4).bank("RolandTR909"))
$: s("cp ~ ~ ~").bank("RolandTR808").room(0.3).gain(0.4)
$: note("c2 ~ eb2 ~ g2 ~").s("sawtooth").lpf(600).gain(0.8)
$: n("0 ~ 4 5 ~ 7").scale("C4:minor").s("square").room(0.3).gain(0.5)
$: note("c4").s("triangle").lpf(800).room(0.7).gain(0.2).slow(2)

BANNED — never output these:
| (pipe character for stacking)    — WRONG, use stack() with commas
$:drums / $:bass / $:lead labels   — WRONG, just use $: 
sound(...)                         — WRONG, use s(...)
.when() .layer() .clip() .begin()  — WRONG, don't exist
CamelCase methods                  — WRONG

RULES:
- First line: setcps(BPM/120)
- Exactly 5 lines starting with $:
- Each $: line is self-contained, no continuation lines
- Drums always use stack() on ONE $: line
- Effects: .lpf .hpf .room .gain .delay .speed .fast .slow .rev .every .degradeBy .resonance .bank
- Note names lowercase: c2 eb3 f#4
- Escape for JSON: \\n between lines, \\" for quotes inside patterns
- Use exact notes/patterns from track data when provided

Return: {"genre":"","bpm":N,"key":"","mood":"","code":"setcps(...)\\n$: stack(...)\\n$: ..."}`;

module.exports = async function handler(req, res) {
  if (req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return res.status(200).end();}
  if (req.method!=='POST') return res.status(405).end();
  res.setHeader('Access-Control-Allow-Origin','*');

  try {
    const b = req.body||{};
    const prompt   = sanitizeStr(b.prompt,300);
    const genre    = ALLOWED_GENRES.includes(b.genre)?b.genre:'';
    const bpm      = sanitizeNum(b.bpm,60,200,128);
    const keyRoot  = ALLOWED_ROOTS.includes(b.keyRoot)?b.keyRoot:'';
    const keyScale = ALLOWED_SCALES.includes(b.keyScale)?b.keyScale:'';
    const refUrl   = (typeof b.refUrl==='string'&&isValidUrl(b.refUrl))?b.refUrl.slice(0,200):'';

    let analysis=null;
    if(b.analysis&&typeof b.analysis==='object') analysis={
      bpm:sanitizeNum(b.analysis.bpm,40,220,bpm),
      key:sanitizeStr(b.analysis.key,20),
      beatPattern:sanitizeStr(b.analysis.beatPattern,80),
      bassContour:sanitizeStr(b.analysis.bassContour,80),
      energy:sanitizeStr(b.analysis.energy,20),
    };

    if(!prompt&&!genre&&!analysis&&!refUrl) return res.status(400).json({error:{message:'No input'}});

    // Only research when there's an explicit URL — skip for plain vibe prompts (saves 3-5s)
    let trackInfo=null;
    if(refUrl) { try{trackInfo=await researchTrack(refUrl);}catch{} }

    // Build lean user message
    const parts=[];
    if(trackInfo) parts.push(`TRACK: bpm=${trackInfo.bpm} key="${trackInfo.key}" chords="${trackInfo.chords||''}" bassline="${trackInfo.bassline||''}" kick="${trackInfo.kickPattern||''}" snare="${trackInfo.snarePattern||''}" hats="${trackInfo.hatPattern||''}" drum="${trackInfo.drumMachine||'RolandTR909'}" synths="${(trackInfo.synths||[]).join(',')}" mood="${trackInfo.mood||''}" energy="${trackInfo.energy||''}"`);
    if(analysis) parts.push(`AUDIO: bpm=${analysis.bpm} key=${analysis.key} beats=${analysis.beatPattern} energy=${analysis.energy}`);
    if(prompt)   parts.push(`VIBE: ${prompt}`);
    if(genre)    parts.push(GENRE_RULES[genre] ? `GENRE: ${genre}\nCOMPOSITION RULES:\n${GENRE_RULES[genre]}` : `GENRE: ${genre}`);
    if(!trackInfo&&bpm) parts.push(`BPM: ${bpm}`);
    if(keyRoot)  parts.push(`KEY: ${keyRoot}${keyScale?' '+keyScale:''}`);
    parts.push('JSON only.');

    let codeData = await callClaude(CODEGEN,[{role:'user',content:parts.join('\n')}],900);

    // validate — if code has pipe syntax or banned patterns, retry once with explicit correction
    const extractParsed = (d) => {
      try {
        const raw=(d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim();
        const clean=raw.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();
        const m=clean.match(/\{[\s\S]*\}/); if(!m) return null;
        return JSON.parse(m[0]);
      } catch { return null; }
    };

    let parsed = extractParsed(codeData);
    if (!parsed || !validateCode(sanitizeCode(parsed.code||''))) {
      // retry with explicit correction message
      const retryMsg = parts.join('\n') + '\n\nCRITICAL: Do NOT use | pipe characters. Do NOT use $:drums $:bass labels. Each layer must be $: stack(...) or $: note(...) — one self-contained line. JSON only.';
      codeData = await callClaude(CODEGEN,[{role:'user',content:retryMsg}],900);
      parsed = extractParsed(codeData);
    }

    if (!parsed) return res.status(500).json({error:{message:'Failed to generate valid code'}});
    parsed.code = sanitizeCode(parsed.code||'');

    const response = { content:[{type:'text',text:JSON.stringify(parsed)}], _trackInfo:trackInfo };
    res.status(200).json(response);
  } catch(err) {
    res.status(500).json({error:{message:err.message}});
  }
}
