import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition";
import Splash from "@/pages/Splash";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import UploadPage from "@/pages/UploadPage";
import Visualizations from "@/pages/Visualizations";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import SettingsPage from "@/pages/SettingsPage";
import DataManager from "@/pages/DataManager";
import InsightsPage from "@/pages/InsightsPage";
import AiAssistant from "@/pages/AiAssistant";
import Predictions from "@/pages/Predictions";
import Reports from "@/pages/Reports";
import Templates from "@/pages/Templates";
import ActivityPage from "@/pages/ActivityPage";
import AppLayout from "./AppLayout";
import NotFound from "@/pages/NotFound";

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Splash /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/upload" element={<PageTransition><UploadPage /></PageTransition>} />
          <Route path="/visualizations" element={<PageTransition><Visualizations /></PageTransition>} />
          <Route path="/projects" element={<PageTransition><Projects /></PageTransition>} />
          <Route path="/projects/:id" element={<PageTransition><ProjectDetail /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
          <Route path="/data-manager" element={<PageTransition><DataManager /></PageTransition>} />
          <Route path="/insights" element={<PageTransition><InsightsPage /></PageTransition>} />
          <Route path="/ai-assistant" element={<PageTransition><AiAssistant /></PageTransition>} />
          <Route path="/predictions" element={<PageTransition><Predictions /></PageTransition>} />
          <Route path="/reports" element={<PageTransition><Reports /></PageTransition>} />
          <Route path="/templates" element={<PageTransition><Templates /></PageTransition>} />
          <Route path="/activity" element={<PageTransition><ActivityPage /></PageTransition>} />
        </Route>
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
