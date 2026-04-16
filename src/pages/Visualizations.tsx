import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, ScatterChart as ScatterIcon,
  Grid3X3, Download, Sparkles, Filter, TrendingUp, AlertTriangle, Lightbulb,
  FileImage, FileText, Loader2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportChartAsPNG, exportChartAsPDF } from "@/lib/chart-export";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart as RechartsScatter, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Area, AreaChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap, FunnelChart, Funnel, LabelList, ComposedChart,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const CHART_COLORS = [
  "hsl(217,91%,60%)", "hsl(160,84%,45%)", "hsl(38,92%,55%)",
  "hsl(280,65%,60%)", "hsl(350,80%,60%)", "hsl(190,80%,50%)",
  "hsl(45,100%,55%)", "hsl(320,70%,55%)",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
  borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px",
  boxShadow: "0 4px 12px -2px hsl(var(--border))",
};
const axisProps = { tick: { fill: "hsl(var(--muted-foreground))", fontSize: 12 }, axisLine: false, tickLine: false };
const gridProps = { strokeDasharray: "3 3" as const, stroke: "hsl(var(--border))" };

const insightConfig: Record<string, { icon: typeof TrendingUp; color: string; bg: string }> = {
  trend:          { icon: TrendingUp, color: "text-chart-1", bg: "bg-chart-1/10" },
  correlation:    { icon: Lightbulb, color: "text-chart-2", bg: "bg-chart-2/10" },
  anomaly:        { icon: AlertTriangle, color: "text-accent", bg: "bg-accent/10" },
  outlier:        { icon: AlertTriangle, color: "text-accent", bg: "bg-accent/10" },
  distribution:   { icon: BarChart3, color: "text-chart-3", bg: "bg-chart-3/10" },
  comparison:     { icon: Grid3X3, color: "text-chart-4", bg: "bg-chart-4/10" },
  summary:        { icon: Sparkles, color: "text-chart-5", bg: "bg-chart-5/10" },
  recommendation: { icon: Lightbulb, color: "text-primary", bg: "bg-primary/10" },
  insight:        { icon: Sparkles, color: "text-chart-4", bg: "bg-chart-4/10" },
};

/**
 * Build real chart data from dataset rows + visualization config.
 * Falls back to sample data only when no real data is available.
 */
function buildRealChartData(viz: any, datasetRows: any[]): any[] {
  const config = viz.config as any;
  const rows = datasetRows || [];
  if (!rows.length) return generateSampleData(viz.chart_type);

  const xAxis = config?.xAxis;
  const yAxis = config?.yAxis;

  if (!xAxis) return generateSampleData(viz.chart_type);

  const type = viz.chart_type;

  if (type === "pie" || type === "donut") {
    const counts = new Map<string, number>();
    rows.forEach(r => {
      const v = String(r[xAxis] ?? "Unknown");
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }

  if (type === "scatter" && yAxis) {
    return rows
      .map(r => ({ x: Number(r[xAxis]), y: Number(r[yAxis]) }))
      .filter(d => Number.isFinite(d.x) && Number.isFinite(d.y));
  }

  if ((type === "bar" || type === "stacked_bar") && yAxis) {
    const grouped = new Map<string, number[]>();
    rows.forEach(r => {
      const k = String(r[xAxis] ?? "Unknown");
      const v = Number(r[yAxis]);
      if (!grouped.has(k)) grouped.set(k, []);
      if (Number.isFinite(v)) grouped.get(k)!.push(v);
    });
    return [...grouped.entries()].map(([name, vals]) => ({
      name,
      value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));
  }

  if (yAxis) {
    return rows.slice(0, 50).map(r => ({
      name: String(r[xAxis] ?? ""),
      value: Number(r[yAxis]) || 0,
    }));
  }

  return generateSampleData(type);
}

function generateSampleData(chartType: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const base = months.map((m) => ({ name: m, value: 3000 + Math.random() * 4000, value2: 1500 + Math.random() * 2000, value3: 500 + Math.random() * 1000 }));

  switch (chartType) {
    case "pie": case "donut":
      return [{ name: "Segment A", value: 35 }, { name: "Segment B", value: 25 }, { name: "Segment C", value: 22 }, { name: "Segment D", value: 18 }];
    case "scatter":
      return Array.from({ length: 30 }, () => ({ x: Math.random() * 100, y: Math.random() * 150 }));
    case "radar":
      return [{ subject: "Sales", A: 80, B: 65 }, { subject: "Marketing", A: 70, B: 85 }, { subject: "Dev", A: 90, B: 70 }, { subject: "Support", A: 60, B: 75 }, { subject: "HR", A: 55, B: 80 }];
    case "treemap":
      return [{ name: "Category A", size: 400 }, { name: "Category B", size: 300 }, { name: "Category C", size: 200 }, { name: "Category D", size: 150 }, { name: "Category E", size: 100 }];
    case "funnel":
      return [{ name: "Visited", value: 5000 }, { name: "Viewed", value: 3500 }, { name: "Cart", value: 2000 }, { name: "Purchased", value: 800 }];
    case "histogram":
      return Array.from({ length: 10 }, (_, i) => ({ range: `${i * 10}-${(i + 1) * 10}`, count: Math.floor(Math.random() * 50 + 5) }));
    default:
      return base;
  }
}

function renderChartByType(type: string, data: any[]) {
  switch (type) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} barGap={4}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Value" />
            {data[0]?.value2 !== undefined && <Bar dataKey="value2" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} name="Secondary" />}
          </BarChart>
        </ResponsiveContainer>
      );
    case "stacked_bar":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="value" stackId="a" fill={CHART_COLORS[0]} name="Primary" />
            <Bar dataKey="value2" stackId="a" fill={CHART_COLORS[1]} name="Secondary" />
            <Bar dataKey="value3" stackId="a" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} name="Tertiary" />
          </BarChart>
        </ResponsiveContainer>
      );
    case "line":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ fill: CHART_COLORS[0], r: 4 }} name="Value" />
          </LineChart>
        </ResponsiveContainer>
      );
    case "multi_line":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} name="Primary" />
            <Line type="monotone" dataKey="value2" stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} name="Secondary" />
            <Line type="monotone" dataKey="value3" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} name="Tertiary" />
          </LineChart>
        </ResponsiveContainer>
      );
    case "pie":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={120} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      );
    case "donut":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={120} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      );
    case "scatter":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <RechartsScatter>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="x" {...axisProps} name="X" />
            <YAxis dataKey="y" {...axisProps} name="Y" />
            <Tooltip contentStyle={tooltipStyle} />
            <Scatter data={data} fill={CHART_COLORS[0]} fillOpacity={0.6} />
          </RechartsScatter>
        </ResponsiveContainer>
      );
    case "area":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="areaG1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} /><stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill="url(#areaG1)" strokeWidth={2} name="Value" />
          </AreaChart>
        </ResponsiveContainer>
      );
    case "stacked_area":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data}>
            <defs>
              {CHART_COLORS.slice(0, 3).map((c, i) => (
                <linearGradient key={i} id={`saG${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c} stopOpacity={0.3} /><stop offset="95%" stopColor={c} stopOpacity={0} /></linearGradient>
              ))}
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Area type="monotone" dataKey="value" stackId="1" stroke={CHART_COLORS[0]} fill="url(#saG0)" name="Primary" />
            <Area type="monotone" dataKey="value2" stackId="1" stroke={CHART_COLORS[1]} fill="url(#saG1)" name="Secondary" />
            <Area type="monotone" dataKey="value3" stackId="1" stroke={CHART_COLORS[2]} fill="url(#saG2)" name="Tertiary" />
          </AreaChart>
        </ResponsiveContainer>
      );
    case "radar":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <PolarRadiusAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <Radar name="Series A" dataKey="A" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.2} />
            <Radar name="Series B" dataKey="B" stroke={CHART_COLORS[1]} fill={CHART_COLORS[1]} fillOpacity={0.2} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Tooltip contentStyle={tooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      );
    case "treemap":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <Treemap data={data} dataKey="size" nameKey="name" stroke="hsl(var(--border))" fill={CHART_COLORS[0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Treemap>
        </ResponsiveContainer>
      );
    case "funnel":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <FunnelChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Funnel dataKey="value" data={data} isAnimationActive>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              <LabelList position="center" fill="hsl(var(--foreground))" fontSize={12} />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      );
    case "histogram":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="range" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Frequency" />
          </BarChart>
        </ResponsiveContainer>
      );
    case "composed":
      return (
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Value" barSize={30} />
            <Line type="monotone" dataKey="value2" stroke={CHART_COLORS[1]} strokeWidth={2} name="Trend" />
          </ComposedChart>
        </ResponsiveContainer>
      );
    default:
      return renderChartByType("bar", data);
  }
}

const chartMeta: Record<string, { icon: typeof BarChart3; label: string }> = {
  bar:          { icon: BarChart3, label: "Bar" },
  stacked_bar:  { icon: BarChart3, label: "Stacked Bar" },
  line:         { icon: LineChartIcon, label: "Line" },
  multi_line:   { icon: LineChartIcon, label: "Multi Line" },
  pie:          { icon: PieChartIcon, label: "Pie" },
  donut:        { icon: PieChartIcon, label: "Donut" },
  scatter:      { icon: ScatterIcon, label: "Scatter" },
  area:         { icon: Grid3X3, label: "Area" },
  stacked_area: { icon: Grid3X3, label: "Stacked Area" },
  radar:        { icon: Grid3X3, label: "Radar" },
  treemap:      { icon: Grid3X3, label: "Treemap" },
  funnel:       { icon: Grid3X3, label: "Funnel" },
  histogram:    { icon: BarChart3, label: "Histogram" },
  composed:     { icon: BarChart3, label: "Composed" },
};

const Visualizations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeChartIdx, setActiveChartIdx] = useState(0);
  const [filterDataset, setFilterDataset] = useState<string>("all");
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: visualizations = [], isLoading } = useQuery({
    queryKey: ["visualizations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visualizations")
        .select("*, datasets(name, ai_insights, preview_rows, columns)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets-viz-filter", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredViz = useMemo(() => {
    if (filterDataset === "all") return visualizations;
    return visualizations.filter((v: any) => v.dataset_id === filterDataset);
  }, [visualizations, filterDataset]);

  // Build chart list from real visualizations
  const chartList = filteredViz.length > 0
    ? filteredViz.map((v: any) => ({
        type: v.chart_type,
        title: v.name,
        reason: v.ai_explanation,
        config: v.config as any,
        datasetRows: (v.datasets as any)?.preview_rows || [],
        datasetName: (v.datasets as any)?.name || "Unknown",
        viz: v,
      }))
    : [
        { type: "bar", title: "Bar Chart", reason: "Upload data to see real charts", config: {}, datasetRows: [], datasetName: "Sample", viz: null },
        { type: "line", title: "Line Chart", reason: "Track trends over time", config: {}, datasetRows: [], datasetName: "Sample", viz: null },
        { type: "donut", title: "Donut Chart", reason: "Show proportional distribution", config: {}, datasetRows: [], datasetName: "Sample", viz: null },
      ];

  const safeIdx = Math.min(activeChartIdx, chartList.length - 1);
  const activeChart = chartList[safeIdx] || chartList[0];
  const meta = chartMeta[activeChart.type] || chartMeta.bar;
  const data = activeChart.viz ? buildRealChartData(activeChart.viz, activeChart.datasetRows) : generateSampleData(activeChart.type);

  // Gather insights from the active dataset
  const insights = useMemo(() => {
    if (!activeChart.viz) return [];
    const ds = activeChart.viz.datasets as any;
    return (ds?.ai_insights as any[]) || [];
  }, [activeChart]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />Visualizations
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {activeChart.datasetName} — {filteredViz.length > 0 ? "AI-generated charts from your data" : "Upload data to generate real charts"}
          </p>
        </div>
        <div className="flex gap-2">
          {datasets.length > 0 && (
            <Select value={filterDataset} onValueChange={(v) => { setFilterDataset(v); setActiveChartIdx(0); }}>
              <SelectTrigger className="w-44 bg-card border-border/50">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All datasets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All datasets</SelectItem>
                {datasets.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-border/50 text-foreground hover:bg-secondary"><Download className="w-4 h-4 mr-2" />Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={async () => {
                if (!chartRef.current) return;
                toast({ title: "Exporting PNG..." });
                await exportChartAsPNG(chartRef.current, activeChart.title || "chart");
              }}>
                <FileImage className="w-4 h-4 mr-2" />Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                if (!chartRef.current) return;
                toast({ title: "Exporting PDF..." });
                await exportChartAsPDF(chartRef.current, activeChart.title || "chart");
              }}>
                <FileText className="w-4 h-4 mr-2" />Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chart area */}
          <motion.div ref={chartRef} className="lg:col-span-3 glass rounded-2xl p-6 relative overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring" as const, stiffness: 200 }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            {/* Chart type tabs */}
            <div className="flex items-center gap-1 mb-4 p-1 bg-secondary/50 rounded-lg overflow-x-auto">
              {chartList.map((ct, idx) => {
                const m = chartMeta[ct.type] || chartMeta.bar;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveChartIdx(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${safeIdx === idx ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <m.icon className="w-3.5 h-3.5" />{m.label}
                  </button>
                );
              })}
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">{activeChart.title || meta.label}</h3>
              {activeChart.reason && <p className="text-xs text-muted-foreground mt-0.5">{activeChart.reason}</p>}
            </div>

            {renderChartByType(activeChart.type, data)}
          </motion.div>

          {/* Insights sidebar */}
          <motion.div className="glass rounded-2xl p-5 space-y-4 max-h-[600px] overflow-y-auto relative" style={{ boxShadow: "var(--shadow-card)" }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, type: "spring" as const, stiffness: 200 }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
              {insights.length > 0 && <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{insights.length}</span>}
            </div>

            {insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight: any, i: number) => {
                  const cfg = insightConfig[insight.type] || insightConfig.insight;
                  const Icon = cfg.icon;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-3 h-3" />{insight.type}
                        </span>
                        {insight.metric && <span className="text-[10px] font-mono font-bold text-foreground">{insight.metric}</span>}
                      </div>
                      {insight.title && <p className="text-xs font-semibold text-foreground mb-0.5">{insight.title}</p>}
                      <p className="text-xs text-foreground/80 leading-relaxed">{insight.text}</p>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { type: "trend", title: "Trends", text: "Upload a dataset to see AI-generated trend analysis" },
                  { type: "correlation", title: "Correlations", text: "Discover hidden relationships between variables" },
                  { type: "anomaly", title: "Anomalies", text: "Detect outliers and unusual patterns in your data" },
                  { type: "recommendation", title: "Actions", text: "Get data-driven recommendations" },
                ].map((insight, i) => {
                  const cfg = insightConfig[insight.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3 h-3" />{insight.type}
                      </span>
                      <p className="text-xs font-semibold text-muted-foreground mb-0.5">{insight.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Visualizations;
