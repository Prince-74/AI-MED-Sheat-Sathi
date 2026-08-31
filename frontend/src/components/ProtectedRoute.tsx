import { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { userAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = PropsWithChildren<{
  allowedRoles?: Array<"doctor" | "patient">;
}>;

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { status, isAuthenticated, user } = userAuthStore();
  const location = useLocation();

  if (status === "INITIALIZING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || status === "UNAUTHENTICATED") {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.type)) {
    const fallback = user.type === "doctor" ? "/doctor/dashboard" : "/patient/home";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
