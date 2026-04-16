import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { BarChart3, Sparkles, ArrowRight, TrendingUp, Zap, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import splashBg from "@/assets/splash-bg.jpg";

const FeatureCard = ({ icon: Icon, title, desc, delay }: { icon: any; title: string; desc: string; delay: number }) => (
  <motion.div
    className="glass rounded-2xl p-6 text-center group hover:border-primary/40 transition-colors"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
  >
    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 glow-primary group-hover:scale-110 transition-transform">
      <Icon className="w-6 h-6 text-primary-foreground" />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
  </motion.div>
);

const Splash = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleGetStarted = () => {
    localStorage.setItem("autoinsight_visited", "true");
    navigate("/auth");
  };

  if (loading) return <div className="min-h-screen bg-background" />;

  return (
    <div className="theme-dark relative h-screen overflow-hidden bg-background">
      {/* Hero Background Image */}
      <div className="absolute inset-0">
        <img src={splashBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background/95" />
      </div>

      {/* Animated glow orbs */}
      <motion.div
        className="absolute top-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/8 blur-[100px]"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Main content - uses h-screen and justify-between to fit everything */}
      <div className="relative z-10 flex flex-col items-center justify-center h-screen px-6 py-8">
        {/* Top spacer */}
        <div className="flex-1 min-h-0" />

        {/* Logo */}
        <motion.div
          className="flex flex-col items-center gap-4 mb-4"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Floating logo icon */}
          <motion.div
            className="relative"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="absolute -inset-3 rounded-3xl opacity-40 blur-xl"
              style={{ background: "var(--gradient-primary)" }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -inset-1.5 rounded-2xl opacity-50 blur-md"
              style={{ background: "var(--gradient-primary)" }}
              animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            <motion.div
              className="relative w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center"
              style={{ boxShadow: "0 0 50px -5px hsl(217 91% 60% / 0.5), 0 0 100px -10px hsl(217 91% 60% / 0.25)" }}
              whileHover={{ scale: 1.15, rotate: 8 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <BarChart3 className="w-8 h-8 text-primary-foreground" />
            </motion.div>
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
          <motion.h1
            className="text-4xl md:text-5xl font-extrabold tracking-tight"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          >
            <span className="text-gradient drop-shadow-[0_0_30px_hsl(217_91%_60%/0.4)]">Auto</span>
            <span className="text-foreground">Insight</span>
          </motion.h1>
        </motion.div>

        {/* Tagline + CTA */}
        <motion.div
          className="text-center max-w-xl mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
            AI-Powered Data Visualization & Analytics
          </h2>
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed max-w-md mx-auto">
            Upload your data, get instant insights, beautiful charts, and actionable intelligence — all powered by AI.
          </p>

          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-gradient-primary text-primary-foreground px-8 py-6 text-base font-bold rounded-2xl glow-primary hover:opacity-90 transition-opacity"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mb-4">
          <FeatureCard icon={Zap} title="Smart Detection" desc="Auto-detect data types and patterns instantly" delay={0.5} />
          <FeatureCard icon={TrendingUp} title="AI Insights" desc="Uncover trends, anomalies & predictions" delay={0.65} />
          <FeatureCard icon={PieChart} title="Beautiful Charts" desc="Stunning visualizations, export anywhere" delay={0.8} />
        </div>

        {/* Bottom spacer */}
        <div className="flex-1 min-h-0" />

        {/* Footer */}
        <motion.p
          className="text-[10px] text-muted-foreground/40 tracking-widest uppercase pb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Secure • AI-Powered • Built for Data Teams
        </motion.p>
      </div>
    </div>
  );
};

export default Splash;
