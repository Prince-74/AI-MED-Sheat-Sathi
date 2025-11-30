import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { userAuthStore } from "@/store/authStore";

const SignUp = () => {
  const navigate = useNavigate();
  const { role } = useParams(); // "doctor" or "patient"
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const resolvedRole = useMemo(() => (role === "doctor" ? "doctor" : "patient"), [role]);
  const {
    registerDoctor,
    registerPatient,
    loading,
    clearError,
    error,
  } = userAuthStore();

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSignUp = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!agreeToTerms) {
      toast.error("Please agree to terms and conditions");
      return;
    }

    try {
      if (resolvedRole === "doctor") {
        await registerDoctor(formData);
        toast.success("Account created successfully as doctor");
        navigate("/onboarding/doctor", { replace: true });
      } else {
        await registerPatient(formData);
        toast.success("Account created successfully as patient");
        navigate("/home", { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to complete signup";
      toast.error(message);
    }
  };

  const handleGoogleSignUp = () => {
    const BASE_URL = import.meta.env.VITE_API_URL;
    if (!BASE_URL) {
      console.error("Missing VITE_API_URL in .env");
      toast.error("Configuration error. Please try again later.");
      return;
    }
    window.location.href = `${BASE_URL}/auth/google?type=${resolvedRole}`;
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 p-2 hover:bg-secondary rounded-full transition-smooth"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        {/* Header */}
        <h1 className="text-3xl font-bold mb-2">
          Sign Up as {resolvedRole === "doctor" ? "Doctor" : "Patient"}
        </h1>
        <p className="text-muted-foreground mb-8">
          Create an account to get started
        </p>

        {/* Form */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-12 rounded-2xl bg-card"
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-12 rounded-2xl bg-card"
            />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-12 rounded-2xl bg-card pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Terms */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={agreeToTerms}
              onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
              I agree to AI-MED{" "}
              <span className="text-primary font-medium">terms of service</span> and{" "}
              <span className="text-primary font-medium">privacy policy</span>.
            </Label>
          </div>

          {/* Submit */}
          <Button onClick={handleSignUp} className="w-full" size="lg" disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>

          {/* Link to Sign In */}
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => navigate(`/signin/${resolvedRole}`)} className="text-primary font-medium">
              Sign in as {resolvedRole}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-4 text-muted-foreground">
                Or sign up with
              </span>
            </div>
          </div>

          {/* Google Sign Up */}
          <Button
            variant="outline"
            className="w-full h-12 justify-start gap-3"
            onClick={handleGoogleSignUp}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
