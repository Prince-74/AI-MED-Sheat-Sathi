import { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { userAuthStore } from "@/store/authStore";

type ProtectedRouteProps = PropsWithChildren<{
  allowedRoles?: Array<"doctor" | "patient">;
}>;

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = userAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.type)) {
    const fallback = user.type === "doctor" ? "/doctor/dashboard" : "/patient/home";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

