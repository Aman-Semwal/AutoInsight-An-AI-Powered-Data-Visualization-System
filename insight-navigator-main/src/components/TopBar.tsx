import { useState, useMemo } from "react";
import { Search, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import NotificationsPopover from "./NotificationsPopover";

const TopBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: datasets = [] } = useQuery({
    queryKey: ["search-datasets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["search-projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    const dsResults = datasets.filter((d: any) => d.name.toLowerCase().includes(q)).map((d: any) => ({ ...d, type: "dataset" as const }));
    const prResults = projects.filter((p: any) => p.name.toLowerCase().includes(q)).map((p: any) => ({ ...p, type: "project" as const }));
    return [...prResults, ...dsResults].slice(0, 8);
  }, [search, datasets, projects]);

  const handleSelect = (item: any) => {
    setSearch("");
    setFocused(false);
    if (item.type === "project") navigate(`/projects/${item.id}`);
    else navigate("/data-manager");
  };

  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search datasets, projects..."
          className="pl-10 bg-secondary/50 border-border/50 h-9 text-sm placeholder:text-muted-foreground/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {focused && search.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {results.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 text-center">No results found</p>
            ) : (
              results.map((item: any) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onMouseDown={() => handleSelect(item)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors text-left"
                >
                  <span className="text-[10px] font-bold uppercase text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    {item.type === "project" ? "PRJ" : "DS"}
                  </span>
                  <span className="truncate">{item.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <NotificationsPopover />
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/settings")}>
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-none">{name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
