import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Share2, Loader2, CheckCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";

const Reports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [reportPreview, setReportPreview] = useState<string>("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-reports", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets-reports", selectedProject],
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select("*").eq("project_id", selectedProject);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProject,
  });

  const { data: visualizations = [] } = useQuery({
    queryKey: ["viz-reports", selectedProject],
    queryFn: async () => {
      const { data, error } = await supabase.from("visualizations").select("*").eq("project_id", selectedProject);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProject,
  });

  const project = projects.find((p: any) => p.id === selectedProject);

  const handleGenerateReport = async (format: "pdf" | "markdown") => {
    if (!project) return;
    setGenerating(true);
    try {
      // Gather all insights from datasets
      const allInsights = datasets.flatMap((ds: any) => (ds.ai_insights as any[]) || []);

      // Call the generate-report edge function for AI-enhanced content
      const { data: reportData, error } = await supabase.functions.invoke("generate-report", {
        body: {
          projectName: project.name,
          datasets: datasets.map((ds: any) => ({
            name: ds.name,
            file_type: ds.file_type,
            row_count: ds.row_count,
            column_count: ds.column_count,
            columns: ds.columns,
          })),
          visualizations: visualizations.map((v: any) => ({
            name: v.name,
            chart_type: v.chart_type,
            ai_explanation: v.ai_explanation,
          })),
          insights: allInsights,
          includeCharts,
          includeInsights,
          includeSummary,
        },
      });

      if (error) throw error;
      const reportContent = reportData?.report || "No report content generated.";
      setReportPreview(reportContent);

      if (format === "pdf") {
        // Generate PDF
        const pdf = new jsPDF();
        const lines = reportContent.split("\n");
        let y = 20;
        const pageWidth = pdf.internal.pageSize.width;
        const margin = 20;
        const maxWidth = pageWidth - margin * 2;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text(project.name, margin, y);
        y += 10;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, y);
        y += 15;
        pdf.setTextColor(0, 0, 0);

        for (const line of lines) {
          if (y > 270) {
            pdf.addPage();
            y = 20;
          }

          const cleaned = line.replace(/[#*|]/g, "").trim();
          if (!cleaned) { y += 5; continue; }

          if (line.startsWith("# ")) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);
            y += 5;
          } else if (line.startsWith("## ")) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            y += 3;
          } else if (line.startsWith("### ")) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11);
          } else {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
          }

          const wrappedLines = pdf.splitTextToSize(cleaned, maxWidth);
          for (const wl of wrappedLines) {
            if (y > 270) { pdf.addPage(); y = 20; }
            pdf.text(wl, margin, y);
            y += pdf.getFontSize() * 0.5 + 2;
          }
        }

        pdf.save(`${project.name}_report.pdf`);
        toast({ title: "PDF Downloaded", description: "Your report has been saved as PDF." });
      } else {
        const blob = new Blob([reportContent], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${project.name}_report.md`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Report Downloaded", description: "Your report has been saved as Markdown." });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate report.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/projects/${selectedProject}`;
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link Copied", description: "Share link copied to clipboard." });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-chart-5 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Generate AI-enhanced project reports</p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-56 bg-card border-border/50"><SelectValue placeholder="Select project" /></SelectTrigger>
          <SelectContent>
            {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </motion.div>

      {!selectedProject ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Select a project to generate reports</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 glass rounded-2xl p-6 space-y-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <h3 className="text-sm font-bold text-foreground">Report Contents</h3>
            <div className="space-y-4">
              {[
                { label: "Summary", checked: includeSummary, onChange: setIncludeSummary },
                { label: "Charts", checked: includeCharts, onChange: setIncludeCharts },
                { label: "AI Insights", checked: includeInsights, onChange: setIncludeInsights },
              ].map(({ label, checked, onChange }) => (
                <div key={label} className="flex items-center justify-between">
                  <Label className="text-sm text-foreground">{label}</Label>
                  <Switch checked={checked} onCheckedChange={onChange} />
                </div>
              ))}
            </div>

            <div className="border-t border-border/30 pt-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground">Export</h3>
              <Button onClick={() => handleGenerateReport("pdf")} disabled={generating} className="w-full bg-gradient-primary text-primary-foreground">
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download PDF
              </Button>
              <Button onClick={() => handleGenerateReport("markdown")} disabled={generating} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />Download Markdown
              </Button>
              <Button onClick={handleShare} variant="outline" className="w-full">
                <Share2 className="w-4 h-4 mr-2" />Copy Share Link
              </Button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 glass rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <h3 className="text-sm font-bold text-foreground mb-4">Report Preview</h3>
            <div className="bg-card rounded-xl p-6 border border-border/30 space-y-4 max-h-[600px] overflow-y-auto">
              <h2 className="text-xl font-bold text-foreground">{project?.name}</h2>
              <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</p>

              {includeSummary && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Datasets", value: datasets.length },
                    { label: "Visualizations", value: visualizations.length },
                    { label: "Data Points", value: datasets.reduce((s: number, d: any) => s + (d.row_count || 0), 0).toLocaleString() },
                  ].map(s => (
                    <div key={s.label} className="bg-secondary/50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {includeInsights && datasets.some((ds: any) => ((ds.ai_insights as any[]) || []).length > 0) && (
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-2">Key Insights</h4>
                  {datasets.flatMap((ds: any) => ((ds.ai_insights as any[]) || []).slice(0, 3)).map((insight: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <CheckCircle className="w-3.5 h-3.5 text-chart-2 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><strong>{insight.title}:</strong> {insight.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {includeCharts && visualizations.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-2">Charts</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {visualizations.slice(0, 4).map((v: any) => (
                      <div key={v.id} className="bg-secondary/30 rounded-lg p-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs font-medium text-foreground">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.chart_type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reportPreview && (
                <div className="border-t border-border/30 pt-4">
                  <h4 className="text-sm font-bold text-foreground mb-2">AI Analysis</h4>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{reportPreview.slice(0, 1000)}...</pre>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Reports;
