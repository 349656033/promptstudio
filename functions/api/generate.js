export async function onRequest(context) {
  const { request, env } = context;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed. Use POST." }),
      { status: 405, headers }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid JSON body." }),
      { status: 400, headers }
    );
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing required field: prompt" }),
      { status: 400, headers }
    );
  }

  // Simple child-friendly filter (client and server-side). This is NOT infallible.
  const bannedPatterns = [
    /\b(nude|naked|porn|xxx|sex|sexual act|hardcore)\b/i,
    /\b(fuck|shit|bitch|cunt|dick|piss)\b/i,
    /\b(child|minor|underage)\s*(sex|sexual|porn)\b/i,
  ];

  function containsBanned(text) {
    if (!text) return false;
    return bannedPatterns.some((re) => re.test(text));
  }

  if (containsBanned(prompt)) {
    return new Response(
      JSON.stringify({ ok: false, error: "Prompt rejected by content policy." }),
      { status: 400, headers }
    );
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing OPENROUTER_API_KEY environment variable." }),
      { status: 500, headers }
    );
  }

  // Allow overriding model from request or environment. Use a conservative default.
  const model = typeof body.model === 'string' && body.model ? body.model : (env.OPENROUTER_MODEL || 'gpt-3o-mini');

  const payload = {
    model,
    messages: [
      { role: 'system', content: 'You are a helpful, child-friendly website planning assistant. Return a polished HTML/CSS/JS website (single-file or small bundle) based on the user prompt. If the prompt asks for sexually explicit content or insults, refuse. If asked for adult-only content, return a brief refusal message.' },
      { role: 'user', content: prompt },
    ],
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 1600,
  };

  // Make the upstream request with a timeout.
  const controller = new AbortController();
  const timeoutMs = 30000; // 30s
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const statusCode = resp.status;
    let result;
    try {
      result = await resp.json();
    } catch (e) {
      // Non-JSON or empty body
      const text = await resp.text().catch(() => '');
      return new Response(
        JSON.stringify({ ok: false, error: 'Upstream returned non-JSON response', status: statusCode, body: text }),
        { status: 502, headers }
      );
    }

    if (!resp.ok) {
      // Handle rate limits explicitly
      if (statusCode === 429) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Upstream rate limit (429). Please try again later.' }),
          { status: 429, headers }
        );
      }

      const message = result?.error?.message || result?.message || 'Upstream API error.';
      return new Response(JSON.stringify({ ok: false, error: message, status: statusCode }), { status: 502, headers });
    }

    // Robust extraction of generated content
    let content = '';
    if (result?.choices && Array.isArray(result.choices) && result.choices.length > 0) {
      // OpenRouter tends to follow OpenAI shapes: choices[0].message.content
      content = result.choices[0]?.message?.content || result.choices[0]?.text || '';
    }

    // Some providers return an "output" or "output_text"
    if (!content) content = result?.output?.[0]?.content || result?.output_text || '';

    if (!content) {
      return new Response(JSON.stringify({ ok: false, error: 'Empty response from model.' }), { status: 502, headers });
    }

    // Screen generated content for disallowed items
    if (containsBanned(content)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Generated content rejected by content policy.' }),
        { status: 403, headers }
      );
    }

    // Return the generated content as JSON (do not return HTML pages for errors)
    return new Response(JSON.stringify({ ok: true, model, prompt, content }), {
      status: 200,
      headers,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return new Response(JSON.stringify({ ok: false, error: 'Upstream request timed out.' }), { status: 504, headers });
    }
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Unknown server error.' }), { status: 500, headers });
  }
}
