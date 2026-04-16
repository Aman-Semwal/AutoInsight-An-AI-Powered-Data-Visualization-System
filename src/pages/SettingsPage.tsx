import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Bell, Shield, Sun, Moon, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Notification preferences stored locally
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("autoinsight_notif_prefs") || "null") || { processing: true, shared: true, weekly: false };
    } catch { return { processing: true, shared: true, weekly: false }; }
  });

  useEffect(() => {
    if (profile?.full_name && !name) setName(profile.full_name);
  }, [profile]);

  const updateNotifPref = (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    localStorage.setItem("autoinsight_notif_prefs", JSON.stringify(updated));
    toast({ title: "Preference saved" });
  };

  const email = user?.email || "";

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated!", description: "Your name has been saved." });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated!", description: "Your password has been changed successfully." });
      setNewPassword("");
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } } };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
        {/* Profile */}
        <motion.div variants={item} className="glass rounded-2xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Profile</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border/50 text-foreground h-10" placeholder="Enter your name"
                onKeyDown={(e) => e.key === "Enter" && handleSave()} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={email} disabled className="bg-secondary border-border/50 text-muted-foreground h-10" />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </motion.div>

        {/* Appearance */}
        <motion.div variants={item} className="glass rounded-2xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Appearance</h2>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm text-foreground font-medium">Dark Mode</span>
              <p className="text-xs text-muted-foreground mt-0.5">Switch between light and dark theme</p>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-muted-foreground" />
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
              <Moon className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div variants={item} className="glass rounded-2xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Notifications</h2>
          </div>
          {[
            { key: "processing", label: "Processing complete", desc: "Get notified when AI analysis finishes" },
            { key: "shared", label: "Shared visualizations", desc: "Alerts when someone shares with you" },
            { key: "weekly", label: "Weekly summary", desc: "Weekly digest of your data activity" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-foreground font-medium">{item.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <Switch checked={notifPrefs[item.key]} onCheckedChange={(v) => updateNotifPref(item.key, v)} />
            </div>
          ))}
        </motion.div>

        {/* Security */}
        <motion.div variants={item} className="glass rounded-2xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Security</h2>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                className="bg-secondary border-border/50 text-foreground h-10"
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} variant="outline" className="border-border/50 text-foreground hover:bg-secondary">
              {changingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : "Change Password"}
            </Button>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={item} className="glass rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Sign Out</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sign out of your account on this device</p>
            </div>
            <Button variant="outline" onClick={() => signOut()} className="border-destructive/30 text-destructive hover:bg-destructive/10">
              Sign Out
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
