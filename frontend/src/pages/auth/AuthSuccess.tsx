import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { userAuthStore } from "@/store/authStore";
import { toast } from "sonner";

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setUser, fetchProfile } = userAuthStore();

  useEffect(() => {
    const token = params.get("token");
    const type = params.get("type");
    const userParam = params.get("user");

    if (!token || !type || !userParam) {
      toast.error("Invalid authentication response");
      navigate("/auth", { replace: true });
      return;
    }

    try {
      const parsedUser = JSON.parse(decodeURIComponent(userParam));
      setUser({ ...parsedUser, type }, token);

      // Fetch extended profile details silently
      fetchProfile().catch(() => undefined);

      const redirectPath = type === "doctor" ? "/doctor/dashboard" : "/patient/home";
      navigate(redirectPath, { replace: true });
    } catch (error) {
      console.error("Failed to process auth callback", error);
      toast.error("Authentication failed. Please try again.");
      navigate("/auth", { replace: true });
    }
  }, [params, navigate, setUser, fetchProfile]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Signing you in...</p>
    </div>
  );
};

export default AuthSuccess;

