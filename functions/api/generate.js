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
      JSON.stringify({
        ok: false,
        error: "Method not allowed. Use POST.",
      }),
      {
        status: 405,
        headers,
      }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Invalid JSON body.",
      }),
      {
        status: 400,
        headers,
      }
    );
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Missing required field: prompt",
      }),
      {
        status: 400,
        headers,
      }
    );
  }

  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Missing OPENAI_API_KEY environment variable.",
      }),
      {
        status: 500,
        headers,
      }
    );
  }

  const model = body.model || "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful website planning assistant. Return a polished response describing a web page structure and suggested content.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: result?.error?.message || "OpenAI request failed.",
        }),
        {
          status: 500,
          headers,
        }
      );
    }

    const content = result?.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        ok: true,
        model,
        prompt,
        content,
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown server error.",
      }),
      {
        status: 500,
        headers,
      }
    );
  }
}
