import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Search, Trash2, Eye, Edit3, RefreshCw, Sparkles, ChevronDown, ChevronUp, History, Save, Loader2 } from "lucide-react";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } } };

const DataManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created_at" | "row_count">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [previewDataset, setPreviewDataset] = useState<any>(null);
  const [cleaningDataset, setCleaningDataset] = useState<any>(null);
  const [versionDataset, setVersionDataset] = useState<any>(null);
  const [renameCol, setRenameCol] = useState<{ dsId: string; oldName: string; newName: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ["all-datasets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["dataset-versions", versionDataset?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("dataset_versions").select("*").eq("dataset_id", versionDataset.id).order("version_number", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!versionDataset,
  });

  // Refresh preview dataset when datasets change
  const currentPreview = previewDataset ? datasets.find((d: any) => d.id === previewDataset.id) || previewDataset : null;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("datasets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-datasets"] });
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      toast({ title: "Deleted", description: "Dataset removed successfully." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const saveVersionMutation = useMutation({
    mutationFn: async (ds: any) => {
      const existingVersions = await supabase.from("dataset_versions").select("version_number").eq("dataset_id", ds.id).order("version_number", { ascending: false }).limit(1);
      const nextVersion = ((existingVersions.data?.[0]?.version_number) || 0) + 1;

      const { error } = await supabase.from("dataset_versions").insert({
        dataset_id: ds.id,
        user_id: user!.id,
        version_number: nextVersion,
        file_url: ds.file_url,
        file_size: ds.file_size,
        row_count: ds.row_count,
        column_count: ds.column_count,
        columns: ds.columns as any,
        preview_rows: ds.preview_rows as any,
        quality_report: ds.quality_report as any,
        ai_insights: ds.ai_insights as any || [],
      });
      if (error) throw error;
      return nextVersion;
    },
    onSuccess: (version) => {
      toast({ title: "Version Saved", description: `Saved as version ${version}.` });
      queryClient.invalidateQueries({ queryKey: ["dataset-versions"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const cleanMutation = useMutation({
    mutationFn: async ({ datasetId, action }: { datasetId: string; action: string }) => {
      const ds = datasets.find((d: any) => d.id === datasetId);
      if (!ds) throw new Error("Dataset not found");

      const rows = (ds.preview_rows as Record<string, any>[]) || [];
      const columns = (ds.columns as string[]) || [];
      let cleanedRows = [...rows];

      if (action === "remove_nulls") {
        cleanedRows = cleanedRows.filter(row => columns.every(col => row[col] !== null && row[col] !== undefined && row[col] !== ""));
      } else if (action === "fill_missing_values") {
        columns.forEach(col => {
          const values = cleanedRows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== "");
          const numVals = values.map(Number).filter(n => !isNaN(n));
          if (numVals.length > values.length * 0.5) {
            const mean = numVals.reduce((s, n) => s + n, 0) / numVals.length;
            cleanedRows = cleanedRows.map(r => ({
              ...r,
              [col]: (r[col] === null || r[col] === undefined || r[col] === "") ? String(Math.round(mean * 100) / 100) : r[col],
            }));
          } else {
            const freq: Record<string, number> = {};
            values.forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
            const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
            cleanedRows = cleanedRows.map(r => ({
              ...r,
              [col]: (r[col] === null || r[col] === undefined || r[col] === "") ? mode : r[col],
            }));
          }
        });
      } else if (action === "remove_duplicates") {
        const seen = new Set<string>();
        cleanedRows = cleanedRows.filter(row => {
          const key = JSON.stringify(row);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      const { error } = await supabase.from("datasets").update({
        preview_rows: cleanedRows as any,
        row_count: cleanedRows.length,
      }).eq("id", datasetId);
      if (error) throw error;
      return { before: rows.length, after: cleanedRows.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["all-datasets"] });
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      toast({ title: "Cleaned", description: `${result.before - result.after} rows affected. ${result.after} rows remaining.` });
      setCleaningDataset(null);
    },
    onError: (e: any) => {
      toast({ title: "Cleaning Failed", description: e.message, variant: "destructive" });
    },
  });

  const renameColumnMutation = useMutation({
    mutationFn: async ({ dsId, oldName, newName }: { dsId: string; oldName: string; newName: string }) => {
      const ds = datasets.find((d: any) => d.id === dsId);
      if (!ds) throw new Error("Dataset not found");
      const cols = (ds.columns as string[]).map(c => c === oldName ? newName : c);
      const rows = (ds.preview_rows as Record<string, any>[]).map(r => {
        const newRow = { ...r };
        if (oldName in newRow) {
          newRow[newName] = newRow[oldName];
          delete newRow[oldName];
        }
        return newRow;
      });
      const { error } = await supabase.from("datasets").update({ columns: cols as any, preview_rows: rows as any }).eq("id", dsId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-datasets"] });
      toast({ title: "Column Renamed" });
      setRenameCol(null);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async ({ dsId, colName }: { dsId: string; colName: string }) => {
      const ds = datasets.find((d: any) => d.id === dsId);
      if (!ds) throw new Error("Dataset not found");
      const cols = (ds.columns as string[]).filter(c => c !== colName);
      const rows = (ds.preview_rows as Record<string, any>[]).map(r => {
        const newRow = { ...r };
        delete newRow[colName];
        return newRow;
      });
      const { error } = await supabase.from("datasets").update({
        columns: cols as any,
        preview_rows: rows as any,
        column_count: cols.length,
      }).eq("id", dsId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-datasets"] });
      toast({ title: "Column Deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async ({ datasetId, versionId }: { datasetId: string; versionId: string }) => {
      const { error } = await supabase.rpc("restore_dataset_version", { _dataset_id: datasetId, _version_id: versionId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-datasets"] });
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      toast({ title: "Restored", description: "Dataset reverted to selected version." });
      setVersionDataset(null);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const filtered = datasets
    .filter((d: any) => d.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      const aVal = a[sortBy], bVal = b[sortBy];
      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Database className="w-5 h-5 text-primary-foreground" />
            </div>
            Data Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage, clean, and version your datasets</p>
        </div>
        <Badge variant="secondary" className="text-xs">{datasets.length} datasets</Badge>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search datasets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border/50" />
        </div>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-40 bg-card border-border/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="row_count">Rows</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}>
          {sortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Database className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No datasets found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Upload data to get started</p>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="glass rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="text-xs font-bold">Name</TableHead>
                <TableHead className="text-xs font-bold">Type</TableHead>
                <TableHead className="text-xs font-bold">Rows</TableHead>
                <TableHead className="text-xs font-bold">Columns</TableHead>
                <TableHead className="text-xs font-bold">Size</TableHead>
                <TableHead className="text-xs font-bold">Updated</TableHead>
                <TableHead className="text-xs font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ds: any) => (
                <motion.tr key={ds.id} variants={item} className="border-border/20 hover:bg-secondary/30 transition-colors group">
                  <TableCell className="font-semibold text-foreground">{ds.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{ds.file_type?.toUpperCase()}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{(ds.row_count || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{ds.column_count || 0}</TableCell>
                  <TableCell className="text-muted-foreground">{formatSize(ds.file_size)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{timeAgo(ds.updated_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewDataset(ds)} title="Preview">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { saveVersionMutation.mutate(ds); }} title="Save Version">
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCleaningDataset(ds)} title="Clean">
                        <Sparkles className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVersionDataset(ds)} title="Versions">
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: ds.id, name: ds.name })} title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}

      {/* Preview Dialog — uses live data from query */}
      <Dialog open={!!previewDataset} onOpenChange={() => setPreviewDataset(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Preview: {currentPreview?.name}</DialogTitle></DialogHeader>
          {currentPreview?.preview_rows && (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {((currentPreview.columns as string[]) || []).map((c: string) => (
                      <TableHead key={c} className="text-xs font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>{c}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setRenameCol({ dsId: currentPreview.id, oldName: c, newName: c })} title="Rename">
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deleteColumnMutation.mutate({ dsId: currentPreview.id, colName: c })} title="Delete column">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((currentPreview.preview_rows as any[]) || []).slice(0, 50).map((row: any, i: number) => (
                    <TableRow key={i}>{((currentPreview.columns as string[]) || []).map((c: string) => <TableCell key={c} className="text-xs whitespace-nowrap">{String(row[c] ?? "")}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Column Dialog */}
      <Dialog open={!!renameCol} onOpenChange={() => setRenameCol(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Column: {renameCol?.oldName}</DialogTitle></DialogHeader>
          <Input
            value={renameCol?.newName || ""}
            onChange={(e) => setRenameCol(prev => prev ? { ...prev, newName: e.target.value } : null)}
            placeholder="New column name"
            onKeyDown={(e) => e.key === "Enter" && renameCol && renameColumnMutation.mutate(renameCol)}
          />
          <Button onClick={() => renameCol && renameColumnMutation.mutate(renameCol)} disabled={renameColumnMutation.isPending}>
            {renameColumnMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Rename
          </Button>
        </DialogContent>
      </Dialog>

      {/* Cleaning Dialog */}
      <Dialog open={!!cleaningDataset} onOpenChange={() => setCleaningDataset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Clean: {cleaningDataset?.name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground mb-2">A version snapshot will be saved before cleaning.</p>
          <div className="space-y-3">
            {[
              { action: "remove_nulls", label: "Remove Null Rows", desc: "Delete rows with any missing values", icon: Trash2 },
              { action: "fill_missing_values", label: "Fill Missing Values", desc: "Auto-fill with mean (numeric) or mode (categorical)", icon: Edit3 },
              { action: "remove_duplicates", label: "Remove Duplicates", desc: "Remove exact duplicate rows", icon: RefreshCw },
            ].map(({ action, label, desc, icon: Icon }) => (
              <button key={action} onClick={async () => {
                await saveVersionMutation.mutateAsync(cleaningDataset);
                cleanMutation.mutate({ datasetId: cleaningDataset?.id, action });
              }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:bg-secondary/50 transition-all text-left group"
                disabled={cleanMutation.isPending || saveVersionMutation.isPending}>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  {(cleanMutation.isPending || saveVersionMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Icon className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={!!versionDataset} onOpenChange={() => setVersionDataset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Versions: {versionDataset?.name}</DialogTitle></DialogHeader>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No saved versions yet. Use the save icon to create a snapshot.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-secondary/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Version {v.version_number}</p>
                    <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()} · {v.row_count} rows · {v.column_count} cols</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => restoreVersionMutation.mutate({ datasetId: versionDataset.id, versionId: v.id })}
                    disabled={restoreVersionMutation.isPending}>
                    {restoreVersionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Restore"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }}
        title="Delete Dataset"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default DataManager;
