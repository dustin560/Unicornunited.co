// Netlify serverless function — proxies workbook requests to Anthropic
// The API key lives in a Netlify environment variable, never exposed to the browser.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ALLOWED_ORIGINS = [
  'https://unicornunited.co',
  'https://www.unicornunited.co',
  'http://localhost:8888',      // netlify dev
  'http://localhost:3000',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export default async (req, context) => {
  const origin = req.headers.get('origin') || '';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: { message: 'API key not configured on server.' } }), {
      status: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    // Only allow the models and limits we expect from workbooks
    const allowed_models = [
      'claude-sonnet-4-20250514',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-6',
    ];
    if (!allowed_models.includes(body.model)) {
      return new Response(JSON.stringify({ error: { message: 'Model not permitted.' } }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    // Cap max_tokens to prevent abuse
    if (body.max_tokens > 2000) body.max_tokens = 2000;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model,
        max_tokens: body.max_tokens || 1000,
        system: body.system,
        messages: body.messages,
      }),
    });

    const data = await anthropicRes.text();

    return new Response(data, {
      status: anthropicRes.status,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: 'Proxy error: ' + err.message } }), {
      status: 502,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/.netlify/functions/claude-proxy',
};
