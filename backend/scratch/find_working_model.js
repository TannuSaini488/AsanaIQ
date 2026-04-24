const fetch = globalThis.fetch;
async function test() {
  const apiKey = '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';
  
  const resModels = await fetch('https://openrouter.ai/api/v1/models');
  const jsonModels = await resModels.json();
  const freeModels = jsonModels.data.filter(m => m.id.includes(':free') || m.pricing.prompt === '0' || m.pricing.prompt === 0).map(m => m.id);
  
  console.log(`Found ${freeModels.length} free models. Testing them to find a working one...`);

  for (const model of freeModels.slice(0, 30)) { // test first 30
    if (model.includes('ling-2.6-1t')) continue;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with JSON {"status": "ok"}' }],
        temperature: 0.2,
      }),
    });
    const json = await res.json();
    if (!json.error && json.choices?.[0]?.message?.content) {
      console.log(`SUCCESS! Model: ${model}`);
      return; // We found a working model!
    }
  }
  console.log("No working free models found in the first 20.");
}
test().catch(console.error);
