module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { messages, system } = req.body;
    const key = process.env.GEMINI_API_KEY;

    // Build Gemini contents array
    const contents = (messages || []).map(function(m) {
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      };
    });

    // If no messages, add a placeholder
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const body = {
      contents: contents,
      generationConfig: { maxOutputTokens: 300 }
    };

    // Add system instruction if provided
    if (system) {
      body.system_instruction = { parts: [{ text: system }] };
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const raw = await r.text();

    if (!r.ok) {
      console.error('Gemini error:', raw);
      return res.status(500).json({ content: [{ type: 'text', text: 'Gemini error: ' + raw }] });
    }

    const data = JSON.parse(raw);
    const text = data.candidates[0].content.parts[0].text || 'No response.';
    return res.status(200).json({ content: [{ type: 'text', text: text }] });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ content: [{ type: 'text', text: 'Error: ' + err.message }] });
  }
};
