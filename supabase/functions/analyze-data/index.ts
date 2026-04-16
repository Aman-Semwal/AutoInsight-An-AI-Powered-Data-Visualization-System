import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { data, columns, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "analyze") {
      systemPrompt = `You are an expert data analyst AI. Analyze the given dataset and return a JSON response with this exact structure:
{
  "columnTypes": [{"name": "col_name", "type": "numeric|categorical|date|text", "description": "brief description"}],
  "suggestedCharts": [{"type": "chart_type", "xAxis": "col", "yAxis": "col", "groupBy": "col_or_null", "reason": "why this chart", "title": "descriptive chart title"}],
  "insights": [{"type": "insight_type", "title": "short title", "text": "description of the insight", "severity": "info|warning|critical", "metric": "optional key number or percentage"}],
  "summary": "A 2-3 sentence summary of the dataset"
}

Chart types to choose from: bar, stacked_bar, line, multi_line, pie, donut, scatter, area, stacked_area, radar, treemap, funnel, histogram, composed.
- Use "stacked_bar" when comparing parts of a whole across categories.
- Use "multi_line" when comparing multiple numeric columns over a shared axis.
- Use "donut" instead of pie for cleaner look when fewer than 7 categories.
- Use "radar" when comparing multiple metrics across categories.
- Use "treemap" for hierarchical proportional data.
- Use "funnel" for sequential stage data (e.g. conversion funnels).
- Use "histogram" for distribution of a single numeric column.
- Use "composed" to overlay bar + line for dual-axis comparisons.
- Set "groupBy" when a categorical column should split data into series.

Suggest 5-8 diverse chart types covering different aspects of the data. Each chart should reveal something different.

Insight types: trend, anomaly, correlation, distribution, comparison, outlier, summary, recommendation.
Generate 8-12 rich insights:
- Include specific numbers, percentages, and comparisons.
- At least 2 trends, 2 correlations, 1 anomaly/outlier, 1 distribution insight, 1 recommendation.
- Each insight must have a short "title" (3-6 words) and a "metric" field with the key number (e.g. "+23%", "3.2x", "$45K").
- "severity" should be "critical" for anomalies/outliers, "warning" for things needing attention, "info" for general observations.
Be data-driven and specific. Never be vague.`;

      userPrompt = `Here are the column names: ${JSON.stringify(columns)}\n\nHere is a sample of the data (first 20 rows):\n${JSON.stringify(data.slice(0, 20), null, 2)}`;
    } else if (action === "explain") {
      systemPrompt = "You are a data visualization expert. Provide a clear, concise explanation of what this chart shows and why it's useful. Keep it to 2-3 sentences.";
      userPrompt = `Explain this chart: ${JSON.stringify(data)}`;
    } else {
      throw new Error("Invalid action");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI processing failed");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: content };
    } catch {
      parsed = { summary: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
