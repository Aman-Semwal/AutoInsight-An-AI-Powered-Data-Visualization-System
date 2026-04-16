import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <BarChart3 className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        <h1 className="text-6xl font-extrabold text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="border-border/50">
            <ArrowLeft className="w-4 h-4 mr-2" />Go Back
          </Button>
          <Button onClick={() => navigate("/dashboard")} className="bg-gradient-primary text-primary-foreground">
            <Home className="w-4 h-4 mr-2" />Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
