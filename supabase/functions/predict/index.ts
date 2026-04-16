import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { rows, dateColumn, valueColumn, forecastPeriods, growthModifier } = await req.json();

    if (!rows || !dateColumn || !valueColumn) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and sort data
    const data = rows
      .map((r: any) => ({ date: r[dateColumn], value: Number(r[valueColumn]) }))
      .filter((r: any) => r.date && Number.isFinite(r.value))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (data.length < 3) {
      return new Response(JSON.stringify({ error: "Need at least 3 data points for forecasting" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const n = data.length;
    const periods = forecastPeriods || 5;
    const modifier = growthModifier || 0;

    // Linear regression
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((s: number, d: any) => s + d.value, 0) / n;
    let num = 0, den = 0;
    data.forEach((d: any, i: number) => {
      num += (i - xMean) * (d.value - yMean);
      den += (i - xMean) ** 2;
    });
    const slope = den ? num / den : 0;
    const intercept = yMean - slope * xMean;
    const modifiedSlope = slope * (1 + modifier / 100);

    // Calculate R-squared
    const ssRes = data.reduce((s: number, d: any, i: number) => {
      const pred = intercept + slope * i;
      return s + (d.value - pred) ** 2;
    }, 0);
    const ssTot = data.reduce((s: number, d: any) => s + (d.value - yMean) ** 2, 0);
    const rSquared = ssTot ? 1 - ssRes / ssTot : 0;

    // Calculate residual std for confidence intervals
    const residualStd = Math.sqrt(ssRes / (n - 2));

    // Build historical + forecast data
    const historicalData = data.map((d: any, i: number) => ({
      label: d.date,
      actual: d.value,
      predicted: null as number | null,
      upper: null as number | null,
      lower: null as number | null,
      fitted: Math.round((intercept + slope * i) * 100) / 100,
    }));

    const lastDate = new Date(data[data.length - 1].date);
    const dayGap = data.length > 1
      ? (new Date(data[data.length - 1].date).getTime() - new Date(data[0].date).getTime()) / (data.length - 1)
      : 86400000;

    const forecasts = [];
    for (let i = 1; i <= periods; i++) {
      const pred = intercept + modifiedSlope * (n - 1 + i);
      const confInterval = residualStd * 1.96 * Math.sqrt(1 + 1/n + ((n - 1 + i - xMean) ** 2) / den);
      const futureDate = new Date(lastDate.getTime() + dayGap * i);
      const point = {
        label: futureDate.toISOString().slice(0, 10),
        actual: null,
        predicted: Math.round(pred * 100) / 100,
        upper: Math.round((pred + confInterval) * 100) / 100,
        lower: Math.round(Math.max(0, pred - confInterval) * 100) / 100,
        fitted: null,
      };
      historicalData.push(point);
      forecasts.push(point);
    }

    // Calculate trend direction and strength
    const trendDirection = modifiedSlope > 0 ? "upward" : modifiedSlope < 0 ? "downward" : "flat";
    const avgValue = yMean;
    const trendStrength = Math.abs(modifiedSlope / avgValue) * 100;

    return new Response(JSON.stringify({
      chartData: historicalData,
      forecasts,
      statistics: {
        slope: Math.round(modifiedSlope * 100) / 100,
        intercept: Math.round(intercept * 100) / 100,
        rSquared: Math.round(rSquared * 1000) / 1000,
        residualStd: Math.round(residualStd * 100) / 100,
        trendDirection,
        trendStrength: Math.round(trendStrength * 10) / 10,
        nextPeriodPrediction: forecasts[0]?.predicted,
        lastPeriodPrediction: forecasts[forecasts.length - 1]?.predicted,
        dataPoints: n,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("predict error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
