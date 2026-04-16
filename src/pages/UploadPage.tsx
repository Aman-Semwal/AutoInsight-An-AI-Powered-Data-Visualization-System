import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, X, Check, ArrowRight, Loader2, Sparkles, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import DataPreview from "@/components/DataPreview";
import { parseCSV, parseJSON, parseExcel, type ParsedData } from "@/lib/file-parsers";
import { analyzeParsedData } from "@/lib/data-intelligence";

const acceptedTypes = [".csv", ".xlsx", ".xls", ".json"];

const floatingParticles = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 3 + Math.random() * 4,
  duration: 4 + Math.random() * 4,
  delay: Math.random() * 2,
}));

const UploadPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [validating, setValidating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback(async (f: File) => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!acceptedTypes.includes(ext)) {
      toast({ title: "Invalid file type", description: "Please upload CSV, Excel, or JSON files.", variant: "destructive" });
      return;
    }
    if (f.size === 0) {
      toast({ title: "Empty file", description: "The file appears to be empty.", variant: "destructive" });
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 50MB.", variant: "destructive" });
      return;
    }

    setFile(f);
    setValidating(true);

    try {
      let result: ParsedData;
      if (ext === ".csv") {
        const text = await f.text();
        result = parseCSV(text);
      } else if (ext === ".json") {
        const text = await f.text();
        result = parseJSON(text);
      } else {
        const buffer = await f.arrayBuffer();
        result = await parseExcel(buffer);
      }

      if (result.columns.length === 0) {
        toast({ title: "Invalid data", description: "Could not detect any columns in the file.", variant: "destructive" });
        reset();
        return;
      }
      setParsed(result);
    } catch {
      toast({ title: "Parse error", description: "Could not read the file. It may be corrupted.", variant: "destructive" });
      reset();
    } finally {
      setValidating(false);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleProcess = async () => {
    if (!file || !parsed || !user) return;
    setProcessing(true);
    setProgress(10);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "csv";
      setProgress(20);
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("datasets").upload(filePath, file);
      if (uploadError) throw uploadError;

      setProgress(40);
      const { data: dataset, error: dbError } = await supabase.from("datasets").insert({
        user_id: user.id,
        name: file.name.replace(/\.[^/.]+$/, ""),
        file_type: ext,
        file_url: filePath,
        file_size: file.size,
        row_count: parsed.totalRows,
        column_count: parsed.columns.length,
        columns: parsed.columns,
        preview_rows: parsed.rows.slice(0, 100) as any,
        status: "processing",
      }).select().single();
      if (dbError) throw dbError;

      setProgress(60);
      // Run local quality analysis
      const qualityReport = analyzeParsedData(parsed);
      const allRows = parsed.rows;
      setProgress(70);
      const { data: aiResult, error: aiError } = await supabase.functions.invoke("analyze-data", {
        body: { data: allRows.slice(0, 200), columns: parsed.columns, action: "analyze" },
      });

      setProgress(90);
      if (aiError) {
        console.error("AI analysis error:", aiError);
        await supabase.from("datasets").update({
          status: "ready",
          quality_report: qualityReport as any,
        }).eq("id", dataset.id);
      } else {
        await supabase.from("datasets").update({
          status: "ready",
          ai_insights: aiResult?.insights || [],
          quality_report: qualityReport as any,
        }).eq("id", dataset.id);

        if (aiResult?.suggestedCharts) {
          const vizInserts = aiResult.suggestedCharts.map((chart: any) => ({
            user_id: user.id,
            dataset_id: dataset.id,
            name: chart.title || `${chart.type} - ${chart.yAxis || "Overview"}`,
            chart_type: chart.type,
            config: chart,
            ai_explanation: chart.reason || "",
          }));
          await supabase.from("visualizations").insert(vizInserts);
        }
      }

      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      queryClient.invalidateQueries({ queryKey: ["viz-count"] });
      toast({ title: "Dataset processed!", description: "AI analysis complete. View your visualizations." });
      setTimeout(() => navigate("/visualizations"), 800);
    } catch (err: any) {
      toast({ title: "Processing failed", description: err.message || "Please try again.", variant: "destructive" });
      setProcessing(false);
      setProgress(0);
    }
  };

  const reset = () => {
    setFile(null);
    setParsed(null);
    setProgress(0);
    setProcessing(false);
  };

  const progressLabel = progress < 30 ? "Uploading file..." : progress < 50 ? "Creating record..." : progress < 80 ? "AI analyzing data..." : progress < 100 ? "Generating visualizations..." : "Complete!";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
          <CloudUpload className="w-8 h-8 text-primary" />Upload Dataset
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">Upload your data file for AI-powered analysis and visualization</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!parsed ? (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative glass rounded-2xl border-2 border-dashed transition-all duration-500 p-16 text-center cursor-pointer overflow-hidden group
                ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]"}`}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = acceptedTypes.join(",");
                input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFile(f); };
                input.click();
              }}
            >
              {/* Animated background particles */}
              {floatingParticles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute rounded-full bg-primary/20 pointer-events-none"
                  style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
                  animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}

              {/* Glow ring on drag */}
              <AnimatePresence>
                {dragOver && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    className="absolute inset-0 rounded-2xl border-2 border-primary/50 pointer-events-none"
                    style={{ boxShadow: "inset 0 0 60px -10px hsl(217 91% 60% / 0.15)" }}
                  />
                )}
              </AnimatePresence>

              {validating ? (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center relative z-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                    <Loader2 className="w-14 h-14 text-primary mb-4" />
                  </motion.div>
                  <p className="text-foreground font-semibold text-lg">Validating {file?.name}...</p>
                  <p className="text-sm text-muted-foreground mt-1">Checking schema and data integrity</p>
                  <motion.div className="mt-4 h-1 w-48 bg-secondary rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-primary rounded-full" animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
                  </motion.div>
                </motion.div>
              ) : (
                <div className="relative z-10">
                  <motion.div
                    whileHover={{ y: -4, scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-chart-4/20 flex items-center justify-center mx-auto mb-5 group-hover:shadow-lg group-hover:shadow-primary/10 transition-shadow"
                  >
                    <Upload className="w-9 h-9 text-primary" />
                  </motion.div>
                  <p className="text-foreground font-semibold text-lg mb-1">
                    Drop your file here, or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-sm text-muted-foreground">Supports CSV, Excel (.xlsx, .xls), and JSON</p>
                  <div className="flex items-center justify-center gap-3 mt-5">
                    {[".CSV", ".XLSX", ".JSON"].map((ext) => (
                      <span key={ext} className="text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-secondary/80 text-muted-foreground border border-border/30">
                        {ext}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground/50 mt-4">Maximum file size: 50MB</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="space-y-5">
            {/* File info card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl p-5 flex items-center justify-between relative overflow-hidden"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-chart-2 via-primary to-chart-4" />
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center"
                >
                  <FileSpreadsheet className="w-6 h-6 text-primary" />
                </motion.div>
                <div>
                  <p className="font-semibold text-foreground text-lg">{file?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {file?.name.split(".").pop()?.toUpperCase()} · {((file?.size || 0) / 1024 / 1024).toFixed(1)} MB · {parsed.totalRows.toLocaleString()} rows · {parsed.columns.length} columns
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-chart-2/15 text-chart-2"
                >
                  <Check className="w-3.5 h-3.5" /> Valid
                </motion.span>
                <button onClick={reset} className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            <DataPreview parsed={parsed} />

            {/* Processing animation */}
            <AnimatePresence>
              {processing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass rounded-2xl p-6 relative overflow-hidden"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/5 to-transparent" style={{ width: `${progress}%`, transition: "width 0.5s ease" }} />
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                        <Sparkles className="w-5 h-5 text-primary" />
                      </motion.div>
                      <p className="text-sm font-bold text-foreground">AI Processing</p>
                    </div>
                    <span className="text-sm text-primary font-mono font-bold">{progress}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden relative z-10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-primary relative"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </motion.div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 relative z-10">{progressLabel}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {!processing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-end gap-3">
                <Button variant="outline" onClick={reset} className="border-border/50 text-foreground hover:bg-secondary">Cancel</Button>
                <Button
                  onClick={handleProcess}
                  className="bg-gradient-primary text-primary-foreground glow-primary hover:opacity-90 hover:scale-105 transition-transform px-6"
                >
                  <Sparkles className="w-4 h-4 mr-2" />Process with AI<ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadPage;
