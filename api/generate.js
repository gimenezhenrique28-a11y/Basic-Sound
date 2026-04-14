export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).end();

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // inject web_search tool so model can look up reference tracks
    const body = {
      ...req.body,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }]
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    // if model used web_search, it may need a follow-up turn to produce final JSON
    // check if last content block is text with JSON, otherwise do a second pass
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    const hasJSON = textBlocks.some(b => b.text && b.text.includes('"code"'));

    if (!hasJSON && data.stop_reason === 'tool_use') {
      // build follow-up with tool results
      const toolUseBlocks = data.content.filter(b => b.type === 'tool_use');
      const toolResults = toolUseBlocks.map(b => ({
        type: 'tool_result',
        tool_use_id: b.id,
        content: b.input?.query ? `Search for: ${b.input.query}` : 'no results'
      }));

      const followUp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          ...body,
          messages: [
            ...body.messages,
            { role: 'assistant', content: data.content },
            { role: 'user', content: toolResults }
          ]
        })
      });
      const followData = await followUp.json();
      return res.status(200).json(followData);
    }

    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}
