import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PLATFORM_FEATURES_PROMPT } from '../_shared/platformFeatures.ts';

const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const getSystemPrompt = () => {
  const today = new Date().toISOString().split("T")[0];

  return `You are a helpful legislative research assistant for New York State.
Today's date: ${today}

IMPORTANT: Provide complete, well-structured responses with full sentences and paragraphs.

When answering questions about NYS legislation:
- Search the web for current, accurate information
- Include specific bill numbers when available (e.g., A00405, S1234)
- Name legislators with their full names and party affiliations
- Cite your sources
- Focus on recent developments from the past 30 days when relevant

Preferred sources:
- Official: nysenate.gov, assembly.state.ny.us, governor.ny.gov
- News: Times Union, NY Times, Politico NY, City & State NY
- Analysis: Empire Center, Fiscal Policy Institute

Always write in complete sentences. Never output partial words or truncated text.`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { prompt, model = "sonar", context = null, temperature = 0.3, stream = true } = body;

    if (!prompt) throw new Error("Missing required 'prompt' field.");
    if (!perplexityApiKey) throw new Error("Perplexity API key not configured.");

    console.log('Perplexity request:', { model, promptLength: prompt?.length, stream });

    // Use frontend-composed systemContext if provided, otherwise fall back to
    // Perplexity's web-search-focused prompt
    const systemContent = context?.systemContext
      ? `${context.systemContext}\n\n${getSystemPrompt()}\n\n${PLATFORM_FEATURES_PROMPT}`
      : `${getSystemPrompt()}\n\n${PLATFORM_FEATURES_PROMPT}`;

    const messages = [
      { role: "system", content: systemContent },
      { role: "user", content: prompt }
    ];

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: 2000,
        stream: stream
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Perplexity API error:", error);
      throw new Error(`Perplexity API returned ${response.status}: ${error}`);
    }

    if (stream) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content ?? "";

      return new Response(
        JSON.stringify({ generatedText, model }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in generate-with-perplexity:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
