export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/api/tts") {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const { text, voiceId, modelId, languageCode } = await request.json();

    if (!env.ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing ELEVENLABS_API_KEY secret" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (!text || !voiceId) {
      return new Response(JSON.stringify({ error: "text and voiceId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: modelId || "eleven_multilingual_v2",
        language_code: languageCode || "zh",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.15,
          use_speaker_boost: true
        }
      })
    });

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text();
      return new Response(errorText, {
        status: elevenResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(elevenResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        ...corsHeaders
      }
    });
  }
};
