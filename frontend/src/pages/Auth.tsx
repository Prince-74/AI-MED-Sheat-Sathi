import { Heart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { userAuthStore } from "@/store/authStore";

const Auth = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = userAuthStore();

  const handleNavigate = (path: string) => {
    if (isAuthenticated) {
      logout();
    }
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-lg mb-4">
            <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AI-MED</h1>
          <p className="text-muted-foreground mt-2">Let’s get started!</p>
          <p className="text-sm text-muted-foreground">Choose your role to continue</p>
        </div>

        {/* Auth Buttons */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Button onClick={() => handleNavigate("/signin/patient")} className="w-full" size="lg">
              Login as Patient
            </Button>
            <Button onClick={() => handleNavigate("/signin/doctor")} className="w-full" size="lg">
              Login as Doctor
            </Button>
          </div>

          <div className="space-y-3">
            <Button onClick={() => handleNavigate("/signup/patient")} variant="outline" className="w-full" size="lg">
              Sign up as Patient
            </Button>
            <Button onClick={() => handleNavigate("/signup/doctor")} variant="outline" className="w-full" size="lg">
              Sign up as Doctor
            </Button>
          </div>

          {isAuthenticated && user && (
            <div className="pt-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Currently signed in as <span className="font-semibold capitalize">{user.type}</span>
              </p>
              <Button variant="secondary" className="w-full" onClick={() => logout()}>
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
