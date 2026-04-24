const fetch = globalThis.fetch;
async function test() {
  const apiKey = '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';
  
  const modelsToTest = [
    'meta-llama/llama-3.2-3b-instruct:free',
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'nousresearch/hermes-3-llama-3.1-405b:free'
  ];

  for (const model of modelsToTest) {
    console.log(`Testing ${model}...`);
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Ping. Reply with JSON {"status": "ok"}' }],
        temperature: 0.2,
      }),
    });
    const json = await res.json();
    if (json.error) {
      console.log(`Failed: ${json.error.message || json.error.code}`);
    } else {
      console.log(`Success! Response: ${json.choices?.[0]?.message?.content}`);
      return; // Found a working model
    }
  }
}
test().catch(console.error);
