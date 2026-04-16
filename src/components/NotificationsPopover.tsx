import { Bell, Sparkles, Upload, BarChart3, TrendingUp, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const iconMap: Record<string, any> = {
  dataset_uploaded: Upload,
  dataset_updated: Upload,
  chart_created: BarChart3,
  chart_updated: BarChart3,
  prediction_run: TrendingUp,
  insight_generated: Sparkles,
};

const NotificationsPopover = () => {
  const { user } = useAuth();

  const { data: activities = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5" />
          {activities.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 glass border-border/50" style={{ boxShadow: "var(--shadow-elevated)" }}>
        <div className="p-3 border-b border-border/30">
          <h4 className="text-sm font-bold text-foreground">Notifications</h4>
          <p className="text-xs text-muted-foreground">Recent activity across your projects</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="p-6 text-center">
              <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            activities.map((act: any) => {
              const Icon = iconMap[act.activity_type] || Sparkles;
              return (
                <div key={act.id} className="flex items-start gap-3 p-3 hover:bg-secondary/30 transition-colors border-b border-border/10 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground line-clamp-1">{act.activity_label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(act.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopover;
