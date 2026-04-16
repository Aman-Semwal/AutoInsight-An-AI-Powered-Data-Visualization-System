import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Sliders, BarChart3, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { analyzeParsedData } from "@/lib/data-intelligence";
import type { ParsedData } from "@/lib/file-parsers";
import { useToast } from "@/hooks/use-toast";

const Predictions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [forecastPeriods, setForecastPeriods] = useState(5);
  const [growthModifier, setGrowthModifier] = useState(0);
  const [predictionResult, setPredictionResult] = useState<any>(null);

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets-predict", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const selectedDs = datasets.find((d: any) => d.id === selectedDataset);

  const { dateCol, numericCols, hasTimeSeries } = useMemo(() => {
    if (!selectedDs) return { dateCol: "", numericCols: [] as string[], hasTimeSeries: false };
    const parsed: ParsedData = {
      columns: (selectedDs.columns as string[]) || [],
      rows: (selectedDs.preview_rows as Record<string, string>[]) || [],
      totalRows: selectedDs.row_count || 0,
    };
    const report = analyzeParsedData(parsed);
    const dateColumns = Object.entries(report.columnTypes).filter(([, t]) => t === "date").map(([k]) => k);
    const numCols = Object.entries(report.columnTypes).filter(([, t]) => t === "numeric").map(([k]) => k);
    return { dateCol: dateColumns[0] || "", numericCols: numCols, hasTimeSeries: dateColumns.length > 0 && numCols.length > 0 };
  }, [selectedDs]);

  const [selectedNumCol, setSelectedNumCol] = useState<string>("");
  const activeNumCol = selectedNumCol || (numericCols.length > 0 ? numericCols[0] : "");

  const predictMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDs || !dateCol || !activeNumCol) throw new Error("Missing data");
      const { data, error } = await supabase.functions.invoke("predict", {
        body: {
          rows: selectedDs.preview_rows,
          dateColumn: dateCol,
          valueColumn: activeNumCol,
          forecastPeriods,
          growthModifier,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setPredictionResult(data);
      // Log activity
      if (selectedDs?.project_id) {
        supabase.from("project_activity").insert({
          project_id: selectedDs.project_id,
          user_id: user!.id,
          activity_type: "prediction_run",
          activity_label: `Prediction generated for ${activeNumCol}`,
          metadata: { dataset_id: selectedDs.id, column: activeNumCol, periods: forecastPeriods } as any,
        }).then(() => {});
      }
    },
    onError: (e: any) => {
      toast({ title: "Prediction Failed", description: e.message, variant: "destructive" });
    },
  });

  // Auto-predict when parameters change
  const handlePredict = () => {
    if (hasTimeSeries && activeNumCol) {
      predictMutation.mutate();
    }
  };

  const chartData = predictionResult?.chartData || [];
  const stats = predictionResult?.statistics;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chart-2 to-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            Predictions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">ML-based forecasting with backend processing</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedDataset} onValueChange={(v) => { setSelectedDataset(v); setPredictionResult(null); }}>
            <SelectTrigger className="w-48 bg-card border-border/50"><SelectValue placeholder="Select dataset" /></SelectTrigger>
            <SelectContent>
              {datasets.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {numericCols.length > 1 && (
            <Select value={activeNumCol} onValueChange={setSelectedNumCol}>
              <SelectTrigger className="w-40 bg-card border-border/50"><SelectValue placeholder="Value column" /></SelectTrigger>
              <SelectContent>
                {numericCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </motion.div>

      {!selectedDataset ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Select a dataset to start forecasting</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Works best with time-series data</p>
        </motion.div>
      ) : !hasTimeSeries ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-accent/50 mx-auto mb-3" />
          <p className="text-foreground font-medium">No time-series data detected</p>
          <p className="text-xs text-muted-foreground mt-1">This dataset needs at least one date column and one numeric column.</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* What-If Controls */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-5">
              <Sliders className="w-4 h-4 text-accent" />What-If Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Forecast Periods</label>
                  <Badge variant="secondary">{forecastPeriods}</Badge>
                </div>
                <Slider value={[forecastPeriods]} onValueChange={([v]) => setForecastPeriods(v)} min={1} max={20} step={1} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Growth Modifier</label>
                  <Badge variant="secondary">{growthModifier > 0 ? "+" : ""}{growthModifier}%</Badge>
                </div>
                <Slider value={[growthModifier]} onValueChange={([v]) => setGrowthModifier(v)} min={-50} max={50} step={5} />
              </div>
              <div className="flex items-end">
                <Button onClick={handlePredict} disabled={predictMutation.isPending} className="w-full bg-gradient-primary text-primary-foreground">
                  {predictMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                  Run Prediction
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Forecast Chart */}
          {chartData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-chart-2" />Forecast: {activeNumCol}
                </h3>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary rounded" />Actual</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-chart-2 rounded" />Predicted</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-chart-2/10 rounded" />Confidence</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160,84%,39%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGrad)" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="transparent" />
                  <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="predicted" stroke="hsl(160,84%,39%)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Statistics */}
          {stats && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Next Period", value: stats.nextPeriodPrediction?.toLocaleString() ?? "—", color: "text-chart-2" },
                { label: "Trend", value: stats.trendDirection === "upward" ? "↑ Upward" : stats.trendDirection === "downward" ? "↓ Downward" : "→ Flat", color: "text-primary" },
                { label: "R² Score", value: stats.rSquared?.toFixed(3) ?? "—", color: "text-accent" },
                { label: "Trend Strength", value: `${stats.trendStrength}%`, color: "text-chart-4" },
              ].map((s) => (
                <div key={s.label} className="glass rounded-xl p-4 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color} mt-1`}>{s.value}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default Predictions;
