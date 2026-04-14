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

const callClaude = async (system, messages, maxTokens=800, model='claude-haiku-4-5-20251001', tools=null) => {
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

// Minimal codegen prompt — examples cut to one, effects list trimmed
const CODEGEN = `Strudel.cc coder. Return ONLY JSON, no markdown.
Valid: s("bd ~ sd ~").bank("RolandTR909") | note("c2 eb2").s("sawtooth") | n("0 2 4").scale("C4:minor").s("square") | stack(...)
Forbidden: sound() .when() .layer() .clip() .begin() .sustain() CamelCase
Effects: .lpf .hpf .room .gain .delay .speed .fast .slow .rev .every .degradeBy .resonance .bank
5 layers: setcps(B/120) then $:drums $:perc $:bass $:lead $:pad
Use exact notes from track data when given. Escape JSON: \\n and \\"
Return: {"genre":"","bpm":N,"key":"","mood":"","code":""}`;

export default async function handler(req, res) {
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
    if(genre)    parts.push(`GENRE: ${genre}`);
    if(!trackInfo&&bpm) parts.push(`BPM: ${bpm}`);
    if(keyRoot)  parts.push(`KEY: ${keyRoot}${keyScale?' '+keyScale:''}`);
    parts.push('JSON only.');

    const codeData = await callClaude(CODEGEN,[{role:'user',content:parts.join('\n')}],800);

    if(codeData.content) codeData.content=codeData.content.map(block=>{
      if(block.type!=='text') return block;
      try{
        const clean=block.text.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();
        const parsed=JSON.parse(clean.match(/\{[\s\S]*\}/)[0]);
        parsed.code=sanitizeCode(parsed.code);
        return{...block,text:JSON.stringify(parsed)};
      }catch{return block;}
    });

    codeData._trackInfo=trackInfo;
    res.status(200).json(codeData);
  } catch(err) {
    res.status(500).json({error:{message:err.message}});
  }
}
