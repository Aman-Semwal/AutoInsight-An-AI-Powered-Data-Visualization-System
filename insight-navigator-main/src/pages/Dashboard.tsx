import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Plus, TrendingUp, Database, BarChart3, ArrowUpRight, FileSpreadsheet, Trash2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

const COLORS = ["hsl(217,91%,60%)", "hsl(160,84%,45%)", "hsl(38,92%,55%)"];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select("*").order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: projectCount = 0 } = useQuery({
    queryKey: ["project-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase.from("projects").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: vizCount = 0 } = useQuery({
    queryKey: ["viz-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase.from("visualizations").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Real activity data from project_activity
  const { data: recentActivity = [] } = useQuery({
    queryKey: ["dashboard-activity", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_activity")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Build real activity chart data from last 7 days
  const activityData = (() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      counts[days[d.getDay()]] = 0;
    }
    recentActivity.forEach((a: any) => {
      const day = days[new Date(a.created_at).getDay()];
      if (day in counts) counts[day]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("datasets").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Error", description: "Failed to delete dataset.", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `"${deleteTarget.name}" has been removed.` });
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      queryClient.invalidateQueries({ queryKey: ["all-datasets"] });
    }
    setDeleteTarget(null);
  };

  const pieData = [
    { name: "CSV", value: datasets.filter((d: any) => d.file_type === "csv").length || 1 },
    { name: "Excel", value: datasets.filter((d: any) => ["xlsx", "xls"].includes(d.file_type)).length || 1 },
    { name: "JSON", value: datasets.filter((d: any) => d.file_type === "json").length || 1 },
  ];

  const processingCount = datasets.filter((d: any) => d.status === "processing").length;
  const insightCount = datasets.reduce((acc: number, d: any) => acc + (d.ai_insights?.length || 0), 0);

  const stats = [
    { label: "Total Datasets", value: String(datasets.length), icon: Database, change: `${projectCount} projects`, gradient: "from-primary to-chart-4" },
    { label: "Visualizations", value: String(vizCount), icon: BarChart3, change: "Charts generated", gradient: "from-chart-2 to-primary" },
    { label: "AI Insights", value: String(insightCount), icon: Sparkles, change: "From your data", gradient: "from-accent to-chart-5" },
    { label: "Processing", value: String(processingCount), icon: Zap, change: processingCount > 0 ? "In queue" : "All done", gradient: "from-chart-4 to-chart-5" },
  ];

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <motion.h1
            className="text-3xl font-extrabold text-foreground tracking-tight"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, type: "spring" as const, stiffness: 200 }}
          >
            Welcome back, <span className="text-gradient">{user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Explorer"}</span>
          </motion.h1>
          <motion.p
            className="text-sm text-muted-foreground mt-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Here's an overview of your data workspace
          </motion.p>
        </div>
        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" onClick={() => navigate("/upload")} className="border-border/50 text-foreground hover:bg-secondary group">
              <Upload className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />Upload
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => navigate("/projects")} className="bg-gradient-primary text-primary-foreground glow-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />New Project
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="glass rounded-2xl p-5 relative overflow-hidden group cursor-pointer"
            style={{ boxShadow: "var(--shadow-card)" }}
            onClick={() => {
              if (stat.label === "Total Datasets") navigate("/data-manager");
              else if (stat.label === "Visualizations") navigate("/visualizations");
              else if (stat.label === "AI Insights") navigate("/insights");
            }}
          >
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`} />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:rotate-45 transition-all duration-300" />
            </div>
            <p className="text-3xl font-extrabold text-foreground tracking-tight relative z-10">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
            <p className="text-xs text-primary/80 mt-1.5 font-medium">{stat.change}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div
          className="lg:col-span-2 glass rounded-2xl p-6 relative overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)" }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <h3 className="text-sm font-bold text-foreground mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />Weekly Activity
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217,91%,60%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="value" stroke="hsl(217,91%,60%)" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          className="glass rounded-2xl p-6 relative overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)" }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-chart-2/40 to-transparent" />
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-chart-2" />Dataset Types
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" stroke="none" animationBegin={300} animationDuration={800}>
                {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-5 mt-3">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-muted-foreground font-medium">{d.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Datasets */}
      <motion.div
        className="glass rounded-2xl overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-accent" />Recent Datasets
            </h3>
            <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">{datasets.length} total</span>
          </div>
        </div>
        {datasets.length === 0 ? (
          <div className="p-12 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">No datasets yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Upload your first file to get started</p>
              <Button variant="outline" onClick={() => navigate("/upload")} className="mt-4 border-border/50 text-foreground hover:bg-secondary">
                <Upload className="w-4 h-4 mr-2" />Upload Dataset
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {datasets.map((ds: any, i: number) => (
              <motion.div
                key={ds.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/data-manager")}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FileSpreadsheet className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{ds.name}</p>
                    <p className="text-xs text-muted-foreground">{ds.file_type?.toUpperCase()} · {ds.row_count?.toLocaleString()} rows · {timeAgo(ds.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ds.status === "ready" ? "bg-chart-2/15 text-chart-2" : ds.status === "processing" ? "bg-accent/15 text-accent animate-pulse" : "bg-secondary text-muted-foreground"}`}>
                    {ds.status}
                  </span>
                  <button
                    onClick={() => setDeleteTarget({ id: ds.id, name: ds.name })}
                    className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Dataset"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
};

export default Dashboard;
