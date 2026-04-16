import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
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

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgot) {
      if (!form.email) {
        toast({ title: "Missing email", description: "Please enter your email address.", variant: "destructive" });
        return;
      }
      setSubmitting(true);
      try {
        const { error } = await resetPassword(form.email);
        if (error) toast({ title: "Reset failed", description: error.message, variant: "destructive" });
        else setResetSent(true);
      } catch {
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (!form.email || !form.password) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(form.email, form.password);
        if (error) toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      } else {
        if (!form.name.trim()) {
          toast({ title: "Missing name", description: "Please enter your name.", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        const { error } = await signUp(form.email, form.password, form.name);
        if (error) toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        else toast({ title: "Account created!", description: "Please check your email to verify your account." });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background" />;

  return (
    <div className="theme-dark relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4">
      {/* Background image matching splash */}
      <div className="absolute inset-0">
        <img src={splashBg} alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background" />
      </div>

      {/* Animated orbs */}
      <FloatingOrb delay={0} x="5%" y="15%" size="420px" />
      <FloatingOrb delay={2.5} x="65%" y="55%" size="380px" />
      <FloatingOrb delay={4.5} x="45%" y="5%" size="300px" />

      {/* Grid overlay */}
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
        {/* Floating Logo — matching Splash */}
        <motion.div
          className="flex flex-col items-center gap-3 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <motion.div
            className="relative"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Outer glow ring */}
            <motion.div
              className="absolute -inset-3 rounded-3xl opacity-40 blur-xl"
              style={{ background: "var(--gradient-primary)" }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Inner glow ring */}
            <motion.div
              className="absolute -inset-1.5 rounded-2xl opacity-50 blur-md"
              style={{ background: "var(--gradient-primary)" }}
              animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            <motion.div
              className="relative w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center"
              style={{ boxShadow: "0 0 50px -5px hsl(217 91% 60% / 0.5), 0 0 100px -10px hsl(217 91% 60% / 0.25)" }}
              whileHover={{ scale: 1.15, rotate: 8 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <BarChart3 className="w-7 h-7 text-primary-foreground" />
            </motion.div>
            {/* Sparkles */}
            <motion.div
              className="absolute -top-1.5 -right-1.5"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6], rotate: [0, 15, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-accent drop-shadow-[0_0_8px_hsl(217_91%_60%/0.8)]" />
            </motion.div>
            <motion.div
              className="absolute -bottom-0.5 -left-0.5"
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
            >
              <Sparkles className="w-3 h-3 text-primary drop-shadow-[0_0_6px_hsl(217_91%_60%/0.6)]" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.div
            className="flex flex-col items-center"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          >
            <span className="text-3xl font-extrabold tracking-tight leading-none">
              <span className="text-gradient drop-shadow-[0_0_30px_hsl(217_91%_60%/0.4)]">Auto</span>
              <span className="text-foreground">Insight</span>
            </span>
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase mt-1">
              AI-Powered Analytics
            </span>
          </motion.div>
        </motion.div>

        {/* Glass Card */}
        <motion.div
          className="glass rounded-3xl p-8 relative overflow-hidden"
          style={{ boxShadow: "var(--shadow-elevated), 0 0 80px -20px hsl(217 91% 60% / 0.12)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-primary rounded-full opacity-60" />

          {/* Subtle inner glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 rounded-full blur-[60px] opacity-[0.06]" style={{ background: "var(--gradient-primary)" }} />

          <AnimatePresence mode="wait">
            <motion.div
              key={isForgot ? "forgot" : isLogin ? "login" : "signup"}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {isForgot ? (
                resetSent ? (
                  <div className="text-center py-4">
                    <Mail className="w-12 h-12 text-primary mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-foreground mb-1">Check your email</h2>
                    <p className="text-sm text-muted-foreground mb-6">We sent a password reset link to <span className="text-foreground font-medium">{form.email}</span></p>
                    <button
                      onClick={() => { setIsForgot(false); setResetSent(false); }}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      ← Back to sign in
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-foreground text-center mb-1">Reset password</h2>
                    <p className="text-sm text-muted-foreground text-center mb-7">Enter your email and we'll send you a reset link</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
                        <div className="relative group">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="pl-11 bg-secondary/40 border-border/30 text-foreground placeholder:text-muted-foreground/30 h-12 rounded-xl transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-secondary/60"
                          />
                        </div>
                      </div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-2">
                        <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground h-12 font-semibold rounded-xl glow-primary hover:opacity-90 transition-opacity text-base relative overflow-hidden">
                          {submitting ? (
                            <motion.div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                          ) : (
                            <span className="relative flex items-center justify-center gap-2">Send Reset Link<ArrowRight className="w-4 h-4" /></span>
                          )}
                        </Button>
                      </motion.div>
                    </form>
                    <button
                      onClick={() => setIsForgot(false)}
                      className="text-sm text-primary hover:underline font-medium mt-5 block mx-auto"
                    >
                      ← Back to sign in
                    </button>
                  </>
                )
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-foreground text-center mb-1">
                    {isLogin ? "Welcome back" : "Create your account"}
                  </h2>
                  <p className="text-sm text-muted-foreground text-center mb-7">
                    {isLogin ? "Sign in to continue to AutoInsight" : "Start visualizing your data with AI"}
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                      <motion.div className="space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</Label>
                        <div className="relative group">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input id="name" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="pl-11 bg-secondary/40 border-border/30 text-foreground placeholder:text-muted-foreground/30 h-12 rounded-xl transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-secondary/60" />
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="pl-11 bg-secondary/40 border-border/30 text-foreground placeholder:text-muted-foreground/30 h-12 rounded-xl transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-secondary/60" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
                        {isLogin && (
                          <button type="button" onClick={() => setIsForgot(true)} className="text-xs text-primary hover:underline font-medium">
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pl-11 pr-11 bg-secondary/40 border-border/30 text-foreground placeholder:text-muted-foreground/30 h-12 rounded-xl transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-secondary/60" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-2">
                      <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground h-12 font-semibold rounded-xl glow-primary hover:opacity-90 transition-opacity text-base relative overflow-hidden">
                        <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12" animate={{ x: ["-200%", "200%"] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }} />
                        {submitting ? (
                          <motion.div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                        ) : (
                          <span className="relative flex items-center justify-center gap-2">
                            {isLogin ? "Sign In" : "Create Account"}
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {!isForgot && (
            <>
              <div className="text-center mt-5">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <span className="font-semibold text-primary hover:underline">{isLogin ? "Sign up" : "Sign in"}</span>
                </button>
              </div>
            </>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-[10px] text-muted-foreground/40 mt-6 tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Secure • AI-Powered • Built for Data Teams
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Auth;
