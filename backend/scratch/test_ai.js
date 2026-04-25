const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function test() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY (set it in backend/.env)');
  const systemText = 'Return ONLY a single valid JSON object. No markdown fences, no comments, no trailing text. Ensure all required keys are present and types match exactly.';
  const userText = 'Analyze yoga progress and return JSON only with keys: {"progressScore":0-100,"consistencyRate":0-100,"strengthAreas":["string"],"riskAreas":["string"],"recommendation":"string"}. No diagnosis.\n\nSessions: []\n\nReviews: []';
  
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemma-7b-it:free',
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: userText },
      ],
      temperature: 0.2,
      max_tokens: 700
    }),
  });
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
test().catch(console.error);
