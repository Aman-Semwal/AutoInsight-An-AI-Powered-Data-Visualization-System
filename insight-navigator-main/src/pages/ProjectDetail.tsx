import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Rows3,
  Columns3,
  AlertTriangle,
  Sparkles,
  BarChart3,
  TrendingUp,
  PieChart,
  Loader2,
  Table2,
  Lightbulb,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DatasetQualityReport, InsightBullet, ChartSuggestion } from "@/lib/data-intelligence";
import {
  BarChart, Bar, LineChart, Line, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter,
} from "recharts";

const CHART_COLORS = [
  "hsl(217, 91%, 55%)", "hsl(160, 84%, 39%)", "hsl(25, 95%, 53%)",
  "hsl(262, 65%, 55%)", "hsl(350, 80%, 55%)", "hsl(190, 80%, 45%)",
];

const severityColor: Record<string, string> = {
  info: "text-primary",
  warning: "text-accent",
  critical: "text-destructive",
};
const severityBg: Record<string, string> = {
  info: "bg-primary/10",
  warning: "bg-accent/10",
  critical: "bg-destructive/10",
};

const insightIcon: Record<string, any> = {
  trend: TrendingUp,
  anomaly: AlertTriangle,
  correlation: BarChart3,
  summary: Table2,
  recommendation: Lightbulb,
};

const SummaryCard = ({ icon: Icon, label, value, gradient }: { icon: any; label: string; value: string | number; gradient: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass rounded-2xl p-5 relative overflow-hidden"
    style={{ boxShadow: "var(--shadow-card)" }}
  >
    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-60`} />
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-primary-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
      </div>
    </div>
  </motion.div>
);

function buildChartData(rows: Record<string, string>[], suggestion: ChartSuggestion) {
  if (!suggestion.xAxis) return [];
  if (suggestion.type === "pie") {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      const v = r[suggestion.xAxis!] || "Unknown";
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }
  if (suggestion.type === "scatter" && suggestion.yAxis) {
    return rows
      .map((r) => ({ x: Number(r[suggestion.xAxis!]), y: Number(r[suggestion.yAxis!]) }))
      .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
  }
  if (suggestion.type === "bar" && suggestion.yAxis) {
    const grouped = new Map<string, number[]>();
    rows.forEach((r) => {
      const k = r[suggestion.xAxis!] || "Unknown";
      const v = Number(r[suggestion.yAxis!]);
      if (!grouped.has(k)) grouped.set(k, []);
      if (Number.isFinite(v)) grouped.get(k)!.push(v);
    });
    return [...grouped.entries()].map(([name, vals]) => ({
      name,
      value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));
  }
  // line
  if (suggestion.yAxis) {
    return rows.map((r) => ({
      name: r[suggestion.xAxis!] || "",
      value: Number(r[suggestion.yAxis!]) || 0,
    }));
  }
  return [];
}

const MiniChart = ({ suggestion, rows }: { suggestion: ChartSuggestion; rows: Record<string, string>[] }) => {
  const data = buildChartData(rows, suggestion);
  if (!data.length) return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        {suggestion.type === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : suggestion.type === "pie" ? (
          <RPieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={2}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
          </RPieChart>
        ) : suggestion.type === "scatter" ? (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="x" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} name={suggestion.xAxis} />
            <YAxis dataKey="y" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} name={suggestion.yAxis} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Scatter data={data} fill={CHART_COLORS[2]} />
          </ScatterChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[0] }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: datasets = [], isLoading: datasetsLoading } = useQuery({
    queryKey: ["project-datasets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datasets")
        .select("*")
        .eq("project_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const isLoading = projectLoading || datasetsLoading;
  const dataset = datasets[0];
  const report = dataset?.quality_report as unknown as DatasetQualityReport | undefined;
  const insights = (dataset?.ai_insights as unknown as InsightBullet[]) || [];
  const suggestions = report?.suggestions || [];
  const rows = (dataset?.preview_rows as unknown as Record<string, string>[]) || [];
  const columns = (dataset?.columns as unknown as string[]) || [];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="ghost" onClick={() => navigate("/projects")} className="mt-4">Back to Projects</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{project.name}</h1>
          {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
        </div>
      </motion.div>

      {!dataset ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-12 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
          <p className="text-foreground font-semibold text-lg">No dataset attached yet</p>
          <p className="text-sm text-muted-foreground mt-1">Upload data from the Upload page and attach it to this project.</p>
          <Button onClick={() => navigate("/upload")} className="mt-5 bg-gradient-primary text-primary-foreground">
            Go to Upload
          </Button>
        </motion.div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard icon={Rows3} label="Total Rows" value={report?.summary?.rows ?? dataset.row_count ?? 0} gradient="from-primary to-chart-4" />
            <SummaryCard icon={Columns3} label="Columns" value={report?.summary?.columns ?? dataset.column_count ?? 0} gradient="from-chart-2 to-primary" />
            <SummaryCard icon={AlertTriangle} label="Missing Values" value={report?.summary?.missingValues ?? 0} gradient="from-accent to-chart-5" />
            <SummaryCard
              icon={Sparkles}
              label="Completeness"
              value={`${report?.summary?.completeness ?? 100}%`}
              gradient="from-chart-4 to-chart-5"
            />
          </div>

          {/* Charts + Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Charts (2 columns) */}
            <div className="lg:col-span-2 space-y-5">
              {suggestions.slice(0, 3).map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="glass rounded-2xl p-5"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{s.title}</h3>
                      <p className="text-xs text-muted-foreground">{s.reason}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      s.priority === "high" ? "bg-primary/10 text-primary" :
                      s.priority === "medium" ? "bg-accent/10 text-accent" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {s.priority}
                    </span>
                  </div>
                  <MiniChart suggestion={s} rows={rows} />
                </motion.div>
              ))}

              {/* Data Preview */}
              {rows.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass rounded-2xl p-5 overflow-hidden"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                    <Table2 className="w-4 h-4 text-primary" />Data Preview
                  </h3>
                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          {columns.slice(0, 6).map((col) => (
                            <th key={col} className="text-left py-2 px-3 text-muted-foreground font-medium whitespace-nowrap">
                              {col}
                              {report?.columnTypes?.[col] && (
                                <span className="ml-1 text-[10px] text-primary/60">({report.columnTypes[col]})</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 8).map((row, ri) => (
                          <tr key={ri} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                            {columns.slice(0, 6).map((col) => (
                              <td key={col} className="py-1.5 px-3 text-foreground whitespace-nowrap">{row[col] || "—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Insights Panel (1 column) */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass rounded-2xl p-5"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />AI Insights
                </h3>
                {insights.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No insights generated yet.</p>
                ) : (
                  <div className="space-y-3">
                    {insights.map((insight, i) => {
                      const Icon = insightIcon[insight.type] || Lightbulb;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * i }}
                          className={`rounded-xl p-3 ${severityBg[insight.severity] || "bg-muted/50"}`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${severityColor[insight.severity]}`} />
                            <div>
                              <p className="text-xs font-semibold text-foreground">{insight.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{insight.text}</p>
                              {insight.metric && (
                                <span className="inline-block mt-1 text-[10px] font-mono font-medium text-primary">{insight.metric}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Column Types */}
              {report?.columnTypes && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass rounded-2xl p-5"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <h3 className="font-semibold text-foreground text-sm mb-3">Column Types</h3>
                  <div className="space-y-2">
                    {Object.entries(report.columnTypes).map(([col, type]) => (
                      <div key={col} className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium truncate mr-2">{col}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          type === "numeric" ? "bg-primary/10 text-primary" :
                          type === "date" ? "bg-chart-2/20 text-chart-2" :
                          type === "categorical" ? "bg-accent/10 text-accent" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {type}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Data Issues */}
              {report?.issues && report.issues.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass rounded-2xl p-5"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent" />Data Issues
                  </h3>
                  <div className="space-y-2">
                    {report.issues.slice(0, 5).map((issue, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          issue.severity === "critical" ? "bg-destructive" :
                          issue.severity === "warning" ? "bg-accent" : "bg-primary"
                        }`} />
                        {issue.message}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectDetail;
