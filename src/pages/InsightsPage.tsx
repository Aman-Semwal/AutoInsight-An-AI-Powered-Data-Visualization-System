import { useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, AlertTriangle, TrendingUp, Target, RefreshCw, ChevronRight, Sparkles, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Insight {
  type: string;
  title: string;
  text: string;
  severity: string;
  metric?: string;
  datasetName?: string;
  datasetId?: string;
}

const categoryConfig = {
  "Key Findings": { icon: Target, color: "text-chart-2", bg: "bg-chart-2/10", types: ["trend", "correlation", "summary", "comparison", "distribution"] },
  "Warnings": { icon: AlertTriangle, color: "text-accent", bg: "bg-accent/10", types: ["anomaly", "outlier"] },
  "Opportunities": { icon: Lightbulb, color: "text-chart-4", bg: "bg-chart-4/10", types: ["recommendation"] },
};

const severityColors = { info: "bg-primary/10 text-primary", warning: "bg-accent/10 text-accent", critical: "bg-destructive/10 text-destructive" };

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } } };

const InsightsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDataset, setSelectedDataset] = useState<string>("all");
  const [explainInsight, setExplainInsight] = useState<Insight | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets-for-insights", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Use AI-generated insights from the datasets (stored in ai_insights column)
  const allInsights: Insight[] = datasets.flatMap((ds: any) => {
    if (selectedDataset !== "all" && ds.id !== selectedDataset) return [];
    const aiInsights = (ds.ai_insights as any[]) || [];
    return aiInsights.map((insight: any) => ({
      ...insight,
      datasetName: ds.name,
      datasetId: ds.id,
    }));
  });

  // Trigger AI analysis for a dataset
  const analyzeMutation = useMutation({
    mutationFn: async (datasetId: string) => {
      const ds = datasets.find((d: any) => d.id === datasetId);
      if (!ds) throw new Error("Dataset not found");

      const { data, error } = await supabase.functions.invoke("analyze-data", {
        body: {
          data: ds.preview_rows,
          columns: ds.columns,
          action: "analyze",
        },
      });

      if (error) throw error;

      // Save insights back to dataset
      const insights = data?.insights || [];
      await supabase.from("datasets").update({
        ai_insights: insights as any,
      }).eq("id", datasetId);

      return insights;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets-for-insights"] });
      toast({ title: "Analysis Complete", description: "AI insights have been generated." });
    },
    onError: (e: any) => {
      toast({ title: "Analysis Failed", description: e.message, variant: "destructive" });
    },
  });

  // Explain insight using AI
  const explainMutation = useMutation({
    mutationFn: async (insight: Insight) => {
      const { data, error } = await supabase.functions.invoke("analyze-data", {
        body: {
          data: { insight },
          columns: [],
          action: "explain",
        },
      });
      if (error) throw error;
      return typeof data === "string" ? data : data?.summary || data?.choices?.[0]?.message?.content || JSON.stringify(data);
    },
    onSuccess: (text) => {
      setExplanation(text);
    },
  });

  const handleExplain = (insight: Insight) => {
    setExplainInsight(insight);
    setExplanation("");
    explainMutation.mutate(insight);
  };

  const handleRefreshAll = () => {
    const targetDatasets = selectedDataset === "all" ? datasets : datasets.filter((d: any) => d.id === selectedDataset);
    targetDatasets.forEach((ds: any) => analyzeMutation.mutate(ds.id));
  };

  const categorized = Object.entries(categoryConfig).map(([name, config]) => ({
    name,
    ...config,
    insights: allInsights.filter(i => config.types.includes(i.type)).filter(i => filter === "all" || i.severity === filter),
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chart-4 to-primary flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary-foreground" />
            </div>
            Insights Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered analysis of your data</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedDataset} onValueChange={setSelectedDataset}>
            <SelectTrigger className="w-48 bg-card border-border/50"><SelectValue placeholder="All datasets" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All datasets</SelectItem>
              {datasets.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32 bg-card border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefreshAll} disabled={analyzeMutation.isPending}>
            {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4">
        {categorized.map(cat => (
          <div key={cat.name} className={`${cat.bg} rounded-xl p-4 flex items-center gap-3`}>
            <cat.icon className={`w-5 h-5 ${cat.color}`} />
            <div>
              <p className="text-sm font-bold text-foreground">{cat.name}</p>
              <p className="text-xs text-muted-foreground">{cat.insights.length} insights</p>
            </div>
          </div>
        ))}
      </motion.div>

      {allInsights.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No insights yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Upload datasets and run AI analysis to generate insights</p>
          {datasets.length > 0 && (
            <Button onClick={handleRefreshAll} disabled={analyzeMutation.isPending} className="bg-gradient-primary text-primary-foreground">
              {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate Insights
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          {categorized.filter(c => c.insights.length > 0).map(cat => (
            <motion.div key={cat.name} variants={item}>
              <h2 className={`text-sm font-bold ${cat.color} mb-3 flex items-center gap-2`}>
                <cat.icon className="w-4 h-4" />{cat.name}
              </h2>
              <div className="space-y-2">
                {cat.insights.map((insight, i) => (
                  <motion.div key={i} variants={item}
                    className="glass rounded-xl p-4 flex items-start gap-3 group hover:bg-secondary/30 transition-all cursor-pointer"
                    style={{ boxShadow: "var(--shadow-card)" }}
                    onClick={() => handleExplain(insight)}>
                    <div className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${severityColors[insight.severity as keyof typeof severityColors] || severityColors.info}`}>
                      {insight.severity}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{insight.text}</p>
                      {insight.datasetName && <p className="text-xs text-primary/70 mt-1">from {insight.datasetName}</p>}
                    </div>
                    {insight.metric && <Badge variant="secondary" className="shrink-0 text-xs">{insight.metric}</Badge>}
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={!!explainInsight} onOpenChange={() => setExplainInsight(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-primary" />Insight Explanation</DialogTitle></DialogHeader>
          {explainInsight && (
            <div className="space-y-4">
              <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${severityColors[explainInsight.severity as keyof typeof severityColors] || severityColors.info}`}>
                {explainInsight.severity}
              </div>
              <h3 className="text-lg font-bold text-foreground">{explainInsight.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{explainInsight.text}</p>
              {explainInsight.metric && (
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Key Metric</p>
                  <p className="text-lg font-bold text-foreground">{explainInsight.metric}</p>
                </div>
              )}
              <div className="border-t border-border/30 pt-4">
                <p className="text-xs font-bold text-foreground mb-2">AI Explanation</p>
                {explainMutation.isPending ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating explanation...
                  </div>
                ) : explanation ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Click to generate an AI explanation.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InsightsPage;
