import { AlertCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AuthError = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const message = params.get("message") || "Authentication failed. Please try again.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Sign-in Error</h1>
        <p className="text-muted-foreground max-w-md">{message}</p>
      </div>
      <Button onClick={() => navigate("/auth", { replace: true })}>Back to sign in</Button>
    </div>
  );
};

export default AuthError;

