import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Database, Clock, FileSpreadsheet, Sparkles, Loader2, ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { parseCSV, parseJSON, parseExcel, type ParsedData } from "@/lib/file-parsers";
import { analyzeParsedData } from "@/lib/data-intelligence";
import { SAMPLE_DATASET, SAMPLE_DATASET_NAME } from "@/lib/sample-data";
import type { Json } from "@/integrations/supabase/types";

interface ProjectInitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  lastDatasetId?: string | null;
}

const acceptedTypes = [".csv", ".xlsx", ".xls", ".json"];

const OptionCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
  gradient,
}: {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  gradient: string;
}) => (
  <motion.button
    whileHover={{ y: -4, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    disabled={disabled}
    className="glass rounded-2xl p-6 text-left relative overflow-hidden group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-full"
    style={{ boxShadow: "var(--shadow-card)" }}
  >
    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg`}>
      <Icon className="w-5 h-5 text-primary-foreground" />
    </div>
    <h3 className="font-bold text-foreground text-base mb-1">{title}</h3>
    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    <ArrowRight className="w-4 h-4 text-muted-foreground absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
  </motion.button>
);

const ProjectInitModal = ({ open, onOpenChange, projectId, projectName, lastDatasetId }: ProjectInitModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");

  const attachDataset = useCallback(
    async (parsed: ParsedData, name: string, fileType: string) => {
      if (!user) return;
      setLoadingLabel("Analyzing your data…");
      const report = analyzeParsedData(parsed);

      setLoadingLabel("Setting up your dashboard…");
      const { error } = await supabase.from("datasets").insert({
        user_id: user.id,
        project_id: projectId,
        name,
        file_type: fileType,
        row_count: parsed.totalRows,
        column_count: parsed.columns.length,
        columns: parsed.columns as unknown as Json,
        preview_rows: parsed.rows.slice(0, 50) as unknown as Json,
        quality_report: report as unknown as Json,
        ai_insights: report.insights as unknown as Json,
        status: "processed",
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      await supabase.from("project_activity").insert({
        project_id: projectId,
        user_id: user.id,
        activity_type: "dataset_attached",
        activity_label: `Dataset "${name}" attached automatically`,
      });

      toast({ title: "Project initialized!", description: `"${name}" attached and analyzed.` });
      onOpenChange(false);
      navigate(`/projects/${projectId}`);
    },
    [user, projectId, toast, onOpenChange, navigate],
  );

  const handleSampleDataset = async () => {
    setLoading(true);
    setLoadingLabel("Loading sample data…");
    await new Promise((r) => setTimeout(r, 600));
    await attachDataset(SAMPLE_DATASET, SAMPLE_DATASET_NAME, "csv");
    setLoading(false);
  };

  const handleLastDataset = async () => {
    if (!user || !lastDatasetId) return;
    setLoading(true);
    setLoadingLabel("Fetching your last dataset…");

    const { data, error } = await supabase
      .from("datasets")
      .select("*")
      .eq("id", lastDatasetId)
      .single();

    if (error || !data) {
      toast({ title: "Error", description: "Could not load previous dataset.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const parsed: ParsedData = {
      columns: (data.columns as string[]) || [],
      rows: (data.preview_rows as Record<string, string>[]) || [],
      totalRows: data.row_count || 0,
    };

    await attachDataset(parsed, data.name + " (copy)", data.file_type);
    setLoading(false);
  };

  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = acceptedTypes.join(",");
    input.onchange = async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      setLoading(true);
      setLoadingLabel("Parsing your file…");

      try {
        const ext = "." + f.name.split(".").pop()?.toLowerCase();
        let result: ParsedData;
        if (ext === ".csv") result = parseCSV(await f.text());
        else if (ext === ".json") result = parseJSON(await f.text());
        else result = await parseExcel(await f.arrayBuffer());
        await attachDataset(result, f.name, ext.slice(1));
      } catch {
        toast({ title: "Parse error", description: "Could not read the file.", variant: "destructive" });
      }
      setLoading(false);
    };
    input.click();
  };

  const handleSkip = async () => {
    if (lastDatasetId) {
      await handleLastDataset();
    } else {
      await handleSampleDataset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50 sm:max-w-lg p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 px-8 gap-5"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              >
                <Sparkles className="w-10 h-10 text-primary" />
              </motion.div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-lg">{loadingLabel}</p>
                <p className="text-sm text-muted-foreground mt-1">Setting up your intelligent workspace</p>
              </div>
              <div className="w-48 h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-primary"
                  initial={{ width: "10%" }}
                  animate={{ width: "90%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Initialize "{projectName}"</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a dataset to start building your dashboard instantly.
                </p>
              </div>

              <div className="space-y-3">
                <OptionCard
                  icon={Upload}
                  title="Upload Dataset"
                  description="Upload a CSV, Excel, or JSON file to analyze."
                  onClick={handleFileUpload}
                  gradient="from-primary to-chart-4"
                />
                <OptionCard
                  icon={Database}
                  title="Use Sample Dataset"
                  description="Start with a pre-built sales dataset to explore features."
                  onClick={handleSampleDataset}
                  gradient="from-chart-2 to-primary"
                />
                <OptionCard
                  icon={Clock}
                  title="Use Last Uploaded Dataset"
                  description="Re-use your most recently uploaded dataset."
                  onClick={handleLastDataset}
                  disabled={!lastDatasetId}
                  gradient="from-accent to-chart-5"
                />
              </div>

              <div className="mt-5 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Skip — auto-attach data
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectInitModal;
