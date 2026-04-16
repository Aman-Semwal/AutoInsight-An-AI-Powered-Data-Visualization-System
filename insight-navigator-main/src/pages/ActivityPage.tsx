import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Upload, BarChart3, Sparkles, Camera, RefreshCw, Database, LayoutTemplate, TrendingUp, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const activityIcons: Record<string, any> = {
  dataset_uploaded: Upload,
  dataset_updated: Database,
  dataset_reverted: RefreshCw,
  chart_created: BarChart3,
  chart_updated: BarChart3,
  snapshot_created: Camera,
  snapshot_restored: RefreshCw,
  template_used: LayoutTemplate,
  prediction_run: TrendingUp,
  report_generated: FileText,
  insight_generated: Sparkles,
};

const activityColors: Record<string, string> = {
  dataset_uploaded: "bg-primary/10 text-primary",
  dataset_updated: "bg-chart-2/10 text-chart-2",
  dataset_reverted: "bg-accent/10 text-accent",
  chart_created: "bg-chart-4/10 text-chart-4",
  chart_updated: "bg-chart-4/10 text-chart-4",
  snapshot_created: "bg-chart-5/10 text-chart-5",
  snapshot_restored: "bg-accent/10 text-accent",
  template_used: "bg-primary/10 text-primary",
  prediction_run: "bg-chart-2/10 text-chart-2",
  report_generated: "bg-chart-5/10 text-chart-5",
  insight_generated: "bg-chart-4/10 text-chart-4",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } } };

const ActivityPage = () => {
  const { user } = useAuth();
  const [filterProject, setFilterProject] = useState<string>("all");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-activity", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-feed", user?.id, filterProject],
    queryFn: async () => {
      let query = supabase.from("project_activity").select("*").order("created_at", { ascending: false }).limit(100);
      if (filterProject !== "all") query = query.eq("project_id", filterProject);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const groupByDate = (items: any[]) => {
    const groups: Record<string, any[]> = {};
    items.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return Object.entries(groups);
  };

  const timeStr = (date: string) => new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chart-5 to-accent flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-foreground" />
            </div>
            Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time tracking of all actions across projects</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{activities.length} events</Badge>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-48 bg-card border-border/50"><SelectValue placeholder="All projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />)}</div>
      ) : activities.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No activity yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Actions will appear here as you work</p>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
          {groupByDate(activities).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{date}</p>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border/50" />
                <div className="space-y-1">
                  {items.map((act: any) => {
                    const Icon = activityIcons[act.activity_type] || Sparkles;
                    const colorClass = activityColors[act.activity_type] || "bg-secondary text-muted-foreground";
                    const projectName = projects.find((p: any) => p.id === act.project_id)?.name;
                    return (
                      <motion.div key={act.id} variants={item} className="flex items-center gap-4 pl-1 py-2.5 group">
                        <div className={`w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center shrink-0 z-10`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{act.activity_label}</p>
                          {projectName && <p className="text-xs text-muted-foreground">{projectName}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{timeStr(act.created_at)}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default ActivityPage;
