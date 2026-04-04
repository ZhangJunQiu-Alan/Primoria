import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { normalizeGeminiHtml } from './normalizeHtml.ts';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.0-flash';
const MAX_OUTPUT_TOKENS = 8192;

const SYSTEM_PROMPT = `You are an expert STEM animation engineer. Your task is to generate a single,
self-contained HTML file that visually animates a STEM concept described by the teacher.

STRICT RULES — follow all of these exactly:
1. Output ONLY the raw HTML. No markdown, no code fences, no explanation text.
2. The output must be a complete, valid HTML document (<!DOCTYPE html> ... </html>).
3. All CSS must be inline inside a <style> tag within <head>.
4. All JavaScript must be inline inside a <script> tag (defer or at end of body).
5. NO external resources — no CDN links, no fetch(), no import from URLs.
6. RESPONSIVE SIZING — CRITICAL:
   - Set html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#1a1a2e; }
   - For canvas elements: set width and height in JS using window.innerWidth and window.innerHeight
   - DO NOT use any fixed pixel widths like width:600px. Use 100%, 100vw, 100vh, or window.innerWidth/Height.
   - All element positions must be computed relative to canvas.width / canvas.height, never hardcoded.
7. Use a dark background (#1a1a2e or similar) that contrasts well with animation elements.
8. Prefer canvas-based animations using requestAnimationFrame. Avoid fixed-pixel DOM layouts.
9. If interactive (play/pause, step, slider), add simple controls at the bottom with position:absolute.
10. Make it visually clear and educational — label key parts where helpful.
11. The animation must start automatically on load (call the animation loop immediately).
12. Add a window resize listener that re-sizes canvas and re-initializes layout when the window is resized.

STEM DOMAIN GUIDANCE:
- Physics: show realistic motion, forces, collisions with labels (velocity, force vectors)
- CS/Algorithms: color-code elements, highlight active comparisons/swaps, show step counter
- Math: plot functions with axes and labels, animate curves or geometric transformations
- Data Structures: visualize memory layout, pointers, node connections

Generate ONLY the HTML document. Nothing else.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Read the platform Gemini API key from secrets
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Platform AI service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Call Gemini
    const geminiUrl = `${GEMINI_BASE_URL}/models/${MODEL}:generateContent?key=${geminiApiKey}`;
    const geminiBody = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt.trim() }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    };

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[gemini-generate] Gemini error', geminiRes.status, errText);
      return new Response(
        JSON.stringify({ error: `AI generation failed (${geminiRes.status})` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const geminiData = await geminiRes.json();
    const html = normalizeGeminiHtml(geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '');

    if (!html.trim()) {
      return new Response(
        JSON.stringify({ error: 'AI returned empty response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ html }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[gemini-generate] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
