import { Calendar, CreditCard, HelpCircle, LogOut, ChevronRight, UserCircle, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo } from "react";
import { userAuthStore } from "@/store/authStore";

const Profile = () => {
  const navigate = useNavigate();
  const { user, fetchProfile, loading, logout } = userAuthStore();

  useEffect(() => {
    if (user && user.id) {
      fetchProfile().catch(() => undefined);
    }
  }, [user?.id, fetchProfile]);

  const initials = useMemo(() => {
    if (!user?.name) return "--";
    return user.name
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }, [user?.name]);

  const menuItems = [
    { icon: Calendar, label: "Appointments", path: "/bookings" },
    { icon: CreditCard, label: "Payment Methods", path: "/payment" },
    { icon: HelpCircle, label: "FAQs", path: "/faqs" },
    { icon: LogOut, label: "Logout", action: () => logout(), variant: "danger" as const },
  ];

  const isDoctor = user?.type === "doctor";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground px-6 pt-8 pb-12 rounded-b-[2rem]">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>

        <Card className="p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">{user?.name || "Guest"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
                {isDoctor ? (
                  <>
                    <Stethoscope className="w-4 h-4" />
                    <span>{user?.specialization || "General Practitioner"}</span>
                  </>
                ) : (
                  <>
                    <UserCircle className="w-4 h-4" />
                    <span>{user?.gender ? user.gender.toUpperCase() : "Profile"}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Account Type</p>
              <p className="text-sm font-semibold text-foreground capitalize">{user?.type}</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Verified</p>
              <p className="text-sm font-semibold text-foreground">{user?.isVerified ? "Yes" : "Pending"}</p>
            </div>
            {!isDoctor && (
              <div className="rounded-xl bg-secondary p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Blood Group</p>
                <p className="text-sm font-semibold text-foreground">{user?.bloodGroup || "--"}</p>
              </div>
            )}
          </div>

          {!isDoctor && (
            <div className="mt-4 grid gap-2">
              <p className="text-sm text-muted-foreground">
                Emergency Contact: {user?.emergencyContact?.name || "Not set"}
              </p>
              <p className="text-sm text-muted-foreground">
                Medications: {user?.medicalHistory?.currentMedications || "Not provided"}
              </p>
            </div>
          )}

          {isDoctor && (
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <p>Experience: {user?.experience ? `${user.experience} yrs` : "--"}</p>
              <p>Consultation Fee: {user?.fees ? `₹${user.fees}` : "--"}</p>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="mt-6"
            onClick={() => navigate(isDoctor ? "/onboarding/doctor" : "/onboarding/patient")}
            disabled={loading}
          >
            {loading ? "Loading profile..." : "Edit profile"}
          </Button>
        </Card>
      </div>

      <div className="px-6 mt-6 space-y-3">
        {menuItems.map((item) => (
          <Card
            key={item.label}
            className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-card-hover transition-smooth"
            onClick={() => {
              if (item.action) {
                item.action();
                navigate("/auth", { replace: true });
              } else if (item.path) {
                navigate(item.path);
              }
            }}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                item.variant === "danger" ? "bg-destructive/10" : "bg-secondary"
              }`}
            >
              <item.icon
                className={`w-6 h-6 ${
                  item.variant === "danger" ? "text-destructive" : "text-primary"
                }`}
              />
            </div>
            <span
              className={`flex-1 font-medium ${
                item.variant === "danger" ? "text-destructive" : ""
              }`}
            >
              {item.label}
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Card>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
