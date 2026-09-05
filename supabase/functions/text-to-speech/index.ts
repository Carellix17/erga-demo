import { withCors, validateAuth, unauthorizedResponse } from '../_shared/auth.ts';

// Allowlist of supported Azure neural voices (it-IT + a few EN fallbacks).
const ALLOWED_VOICES = new Set<string>([
  'it-IT-ElsaNeural',
  'it-IT-IsabellaNeural',
  'it-IT-DiegoNeural',
  'it-IT-BenignoNeural',
  'it-IT-CalimeroNeural',
  'it-IT-GianniNeural',
  'it-IT-PalmiraNeural',
  'it-IT-PierinaNeural',
  'en-US-JennyNeural',
  'en-US-GuyNeural',
]);

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')
   .replace(/'/g, '&apos;');

Deno.serve(withCors(async (req) => {
  try {
    // Require authenticated user — prevents anonymous abuse of Azure credits.
    try {
      await validateAuth(req);
    } catch {
      return unauthorizedResponse('Sessione scaduta. Effettua di nuovo l\'accesso.');
    }

    const { text, voice } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const truncated = text.length > 3000 ? text.slice(0, 3000) : text;

    const key = Deno.env.get('AZURE_SPEECH_KEY');
    const region = Deno.env.get('AZURE_SPEECH_REGION') || 'italynorth';

    // 1) Azure (se configurato e funzionante)
    if (key) {
      const requested = typeof voice === 'string' ? voice : '';
      const voiceName = ALLOWED_VOICES.has(requested) ? requested : 'it-IT-ElsaNeural';
      const ssml = `<speak version='1.0' xml:lang='it-IT'><voice xml:lang='it-IT' xml:gender='Female' name='${escapeXml(voiceName)}'>${escapeXml(truncated)}</voice></speak>`;
      const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
      try {
        const azureRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
            'User-Agent': 'erga-tts',
          },
          body: ssml,
        });
        if (azureRes.ok) {
          const audio = await azureRes.arrayBuffer();
          return new Response(audio, {
            status: 200,
            headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
          });
        }
        console.error('Azure TTS error', azureRes.status, '- fallback to Lovable AI');
      } catch (e) {
        console.error('Azure TTS fetch failed - fallback to Lovable AI', e);
      }
    }

    // 2) Fallback: Lovable AI Gateway (nessuna chiave esterna richiesta)
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: 'TTS service unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini-tts',
        input: truncated,
        voice: 'alloy',
        response_format: 'mp3',
        instructions: 'Parla in italiano, con tono chiaro e naturale.',
      }),
    });

    if (!aiRes.ok) {
      console.error('Lovable AI TTS error', aiRes.status, await aiRes.text().catch(() => ''));
      return new Response(JSON.stringify({ error: 'TTS service error' }), {
        status: aiRes.status === 429 ? 429 : 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const audio = await aiRes.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });

  } catch (err) {
    console.error('TTS function error', err);
    return new Response(JSON.stringify({ error: 'TTS service error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}));