import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch, getAuthToken } from "@/lib/apiClient";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import HospitalList from "./pages/HospitalList";
import HospitalForm from "./pages/HospitalForm";
import PatientDetails from "./pages/PatientDetails";
import InvoiceCreate from "./pages/InvoiceCreate";
import InvoiceDashboard from "./pages/InvoiceDashboard";
import InvoiceEdit from "./pages/InvoiceEdit";
import Credentials from "./pages/Credentials";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

interface LoggedInUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isWebsiteHead?: boolean;
}

const getLoggedInUser = (): LoggedInUser | null => {
  const stored = localStorage.getItem('loggedInUser');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }

      try {
        const result = await apiFetch<{ user: { status?: string } }>("/api/auth/me");
        setIsAuthenticated(result?.user?.status !== "inactive");
      } catch {
        setIsAuthenticated(false);
      }
      setIsChecking(false);
    };
    checkAuth();
  }, []);

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const WebsiteHeadRoute = ({ children }: { children: React.ReactNode }) => {
  const user = getLoggedInUser();
  
  if (!user?.isWebsiteHead) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hospitals"
        element={
          <ProtectedRoute>
            <HospitalList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hospitals/add"
        element={
          <ProtectedRoute>
            <HospitalForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hospitals/:id"
        element={
          <ProtectedRoute>
            <HospitalForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hospitals/:id/edit"
        element={
          <ProtectedRoute>
            <HospitalForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <PatientDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <InvoiceDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/create"
        element={
          <ProtectedRoute>
            <InvoiceCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:id/edit"
        element={
          <ProtectedRoute>
            <InvoiceEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/credentials"
        element={
          <ProtectedRoute>
            <WebsiteHeadRoute>
              <Credentials />
            </WebsiteHeadRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;