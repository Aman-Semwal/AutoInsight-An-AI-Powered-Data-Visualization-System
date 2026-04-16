import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Lock, Eye, EyeOff, ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import splashBg from "@/assets/splash-bg.jpg";

const FloatingOrb = ({ delay, x, y, size }: { delay: number; x: string; y: string; size: string }) => (
  <motion.div
    className="absolute rounded-full blur-[100px]"
    style={{ left: x, top: y, width: size, height: size, background: "var(--gradient-primary)", opacity: 0.15 }}
    animate={{ y: [0, -40, 0], scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
    transition={{ duration: 7, repeat: Infinity, delay, ease: "easeInOut" }}
  />
);

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isRecovery && !success) {
    return (
      <div className="theme-dark relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4">
        <div className="absolute inset-0">
          <img src={splashBg} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background" />
        </div>
        <div className="relative z-10 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Invalid Reset Link</h2>
          <p className="text-muted-foreground mb-4">This link is invalid or has expired.</p>
          <Button onClick={() => navigate("/auth")} variant="outline">Back to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-dark relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4">
      <div className="absolute inset-0">
        <img src={splashBg} alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background" />
      </div>
      <FloatingOrb delay={0} x="5%" y="15%" size="420px" />
      <FloatingOrb delay={2.5} x="65%" y="55%" size="380px" />
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <motion.div className="flex flex-col items-center gap-3 mb-8">
          <motion.div
            className="relative"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="absolute -inset-3 rounded-3xl opacity-40 blur-xl"
              style={{ background: "var(--gradient-primary)" }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              className="relative w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center"
              style={{ boxShadow: "0 0 50px -5px hsl(217 91% 60% / 0.5)" }}
            >
              <BarChart3 className="w-7 h-7 text-primary-foreground" />
            </div>
            <motion.div
              className="absolute -top-1.5 -right-1.5"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-accent drop-shadow-[0_0_8px_hsl(217_91%_60%/0.8)]" />
            </motion.div>
          </motion.div>
          <span className="text-3xl font-extrabold tracking-tight">
            <span className="text-gradient">Auto</span>
            <span className="text-foreground">Insight</span>
          </span>
        </motion.div>

        {/* Card */}
        <motion.div
          className="glass rounded-3xl p-8 relative overflow-hidden"
          style={{ boxShadow: "var(--shadow-elevated), 0 0 80px -20px hsl(217 91% 60% / 0.12)" }}
        >
          <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-primary rounded-full opacity-60" />

          {success ? (
            <motion.div
              className="text-center py-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-foreground mb-1">Password Updated!</h2>
              <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
            </motion.div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground text-center mb-1">Set New Password</h2>
              <p className="text-sm text-muted-foreground text-center mb-7">Enter your new password below</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 bg-secondary/40 border-border/30 text-foreground placeholder:text-muted-foreground/30 h-12 rounded-xl transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-secondary/60"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11 bg-secondary/40 border-border/30 text-foreground placeholder:text-muted-foreground/30 h-12 rounded-xl transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-secondary/60"
                    />
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-primary text-primary-foreground h-12 font-semibold rounded-xl glow-primary hover:opacity-90 transition-opacity text-base relative overflow-hidden"
                  >
                    {submitting ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <span className="relative flex items-center justify-center gap-2">
                        Update Password
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
