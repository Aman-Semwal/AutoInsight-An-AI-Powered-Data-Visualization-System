import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FolderOpen, Clock, Trash2, Layers, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ProjectInitModal from "@/components/ProjectInitModal";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

const GRADIENTS = [
  "from-primary to-chart-4",
  "from-chart-2 to-primary",
  "from-accent to-chart-5",
  "from-chart-4 to-chart-5",
  "from-chart-5 to-primary",
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
};

const Projects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [initModal, setInitModal] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: lastDataset } = useQuery({
    queryKey: ["last-dataset", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("datasets")
        .select("id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Get dataset counts per project
  const { data: datasetCounts = {} } = useQuery({
    queryKey: ["project-dataset-counts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select("project_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((d: any) => { if (d.project_id) counts[d.project_id] = (counts[d.project_id] || 0) + 1; });
      return counts;
    },
    enabled: !!user,
  });

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    const { data: newProject, error } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: newName.trim() })
      .select("id, name")
      .single();
    setCreating(false);
    if (error || !newProject) {
      toast({ title: "Error", description: error?.message ?? "Unknown error", variant: "destructive" });
    } else {
      setShowCreate(false);
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setInitModal({ id: newProject.id, name: newProject.name });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("projects").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `"${deleteTarget.name}" has been removed.` });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-count"] });
    }
    setDeleteTarget(null);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  const filteredProjects = projects.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <Layers className="w-8 h-8 text-primary" />Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Organize your datasets and visualizations into workspaces</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-gradient-primary text-primary-foreground glow-primary hover:opacity-90 hover:scale-105 transition-transform">
          <Plus className="w-4 h-4 mr-2" />New Project
        </Button>
      </motion.div>

      {/* Search */}
      {projects.length > 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border/50 h-9" />
          </div>
        </motion.div>
      )}

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence>
          {filteredProjects.map((project: any, i: number) => {
            const grad = GRADIENTS[i % GRADIENTS.length];
            const dsCount = datasetCounts[project.id] || 0;
            return (
              <motion.div
                key={project.id}
                variants={item}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="glass rounded-2xl p-6 relative overflow-hidden group cursor-pointer"
                style={{ boxShadow: "var(--shadow-card)" }}
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${grad} opacity-60 group-hover:opacity-100 transition-opacity`} />
                <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${grad} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500`} />

                <div className="flex items-start justify-between mb-5 relative z-10">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg`}>
                    <FolderOpen className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: project.id, name: project.name }); }}
                    className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-foreground text-lg mb-1 relative z-10">{project.name}</h3>
                {project.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>}
                <div className="flex items-center justify-between mt-4 relative z-10">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(project.created_at)}</span>
                    {dsCount > 0 && <span>{dsCount} dataset{dsCount > 1 ? "s" : ""}</span>}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Create new card */}
        <motion.div
          variants={item}
          whileHover={{ y: -4, borderColor: "hsl(217,91%,60%)" }}
          onClick={() => setShowCreate(true)}
          className="rounded-2xl border-2 border-dashed border-border/50 p-6 flex flex-col items-center justify-center min-h-[220px] cursor-pointer group transition-all duration-300 hover:bg-primary/5"
        >
          <motion.div
            whileHover={{ rotate: 90 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-chart-4/20 flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow"
          >
            <Plus className="w-6 h-6 text-primary" />
          </motion.div>
          <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Create New Project</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Start organizing your data</p>
        </motion.div>
      </motion.div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass border-border/50">
          <DialogHeader><DialogTitle className="text-foreground text-lg">Create New Project</DialogTitle></DialogHeader>
          <Input
            placeholder="Project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-secondary border-border/50 text-foreground h-11"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-border/50 text-foreground">Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All datasets and visualizations in this project will be permanently removed.`}
        loading={deleting}
      />

      {initModal && (
        <ProjectInitModal
          open={!!initModal}
          onOpenChange={(open) => { if (!open) setInitModal(null); }}
          projectId={initModal.id}
          projectName={initModal.name}
          lastDatasetId={lastDataset?.id}
        />
      )}
    </div>
  );
};

export default Projects;
