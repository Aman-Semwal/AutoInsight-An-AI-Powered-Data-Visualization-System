import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";

const AppLayout = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
