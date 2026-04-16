import { useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3, LayoutDashboard, FolderOpen, Upload, LineChart, Settings, LogOut,
  ChevronLeft, ChevronRight, Database, Lightbulb, Bot, TrendingUp, FileText,
  LayoutTemplate, Clock,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const navSections = [
  {
    label: "Core",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: FolderOpen, label: "Projects", path: "/projects" },
      { icon: Upload, label: "Upload", path: "/upload" },
      { icon: LineChart, label: "Visualizations", path: "/visualizations" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { icon: Database, label: "Data Manager", path: "/data-manager" },
      { icon: Lightbulb, label: "Insights", path: "/insights" },
      { icon: Bot, label: "AI Assistant", path: "/ai-assistant" },
      { icon: TrendingUp, label: "Predictions", path: "/predictions" },
    ],
  },
  {
    label: "Tools",
    items: [
      { icon: FileText, label: "Reports", path: "/reports" },
      { icon: LayoutTemplate, label: "Templates", path: "/templates" },
      { icon: Clock, label: "Activity", path: "/activity" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <aside className={cn(
      "h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
      collapsed ? "w-[72px]" : "w-[240px]"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border shrink-0">
        <motion.div
          whileHover={{ rotate: 12, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <BarChart3 className="w-4 h-4 text-primary-foreground" />
        </motion.div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg font-bold whitespace-nowrap cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <span className="text-gradient">Auto</span><span className="text-foreground">Insight</span>
          </motion.span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label} className="mb-2">
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 mb-1.5 mt-3 first:mt-0">
                {section.label}
              </p>
            )}
            {collapsed && <div className="h-px bg-border/30 mx-2 my-2" />}
            {section.items.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path === "/projects" && location.pathname.startsWith("/projects/"));
              return (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  whileHover={{ x: collapsed ? 0 : 2 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span>{item.label}</span>}
                </motion.button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-1 border-t border-sidebar-border pt-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
