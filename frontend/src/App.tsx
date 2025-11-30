import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import AuthSuccess from "./pages/auth/AuthSuccess";
import AuthError from "./pages/auth/AuthError";
import Home from "./pages/Dashboard/Home";
import DoctorDetail from "./pages/DoctorDetail";
import Pharmacy from "./pages/Pharmacy";
import Profile from "./pages/Profile";
import SymptomChecker from "./pages/SymptomChecker";
import ReportAnalyzer from "./pages/ReportAnalyzer";
import MedicationAssistant from "./pages/MedicationAssistant";
import HealthRecords from "./pages/HealthRecords";
import NotFound from "./pages/NotFound";
import PatientOnboarding from "./pages/Onboarding/PatientOnboarding";
import DoctorOnboarding from "./pages/Onboarding/DoctorOnboarding";
import DoctorDashboard from "./pages/Dashboard/DoctorDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route path="/auth/error" element={<AuthError />} />

          {/* ✅ Role-based authentication routes */}
          <Route path="/signin/:role" element={<SignIn />} />
          <Route path="/signup/:role" element={<SignUp />} />

          {/* (Optional) keep generic routes for backward compatibility */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Main app routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="/doctor/:id" element={<DoctorDetail />} />
          <Route path="/explore" element={<Pharmacy />} />
          <Route path="/pharmacy" element={<Pharmacy />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/symptom-checker"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <SymptomChecker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-analyzer"
            element={
              <ProtectedRoute allowedRoles={["patient", "doctor"]}>
                <ReportAnalyzer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medication-assistant"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <MedicationAssistant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/health-records"
            element={
              <ProtectedRoute allowedRoles={["patient", "doctor"]}>
                <HealthRecords />
              </ProtectedRoute>
            }
          />

          {/* Onboarding routes */}
          <Route
            path="/onboarding/patient"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <PatientOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/doctor"
            element={
              <ProtectedRoute allowedRoles={["doctor"]}>
                <DoctorOnboarding />
              </ProtectedRoute>
            }
          />

          {/* Post-login routes */}
          <Route
            path="/patient/home"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={["doctor"]}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
