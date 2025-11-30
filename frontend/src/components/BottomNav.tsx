import { Home, Search, Calendar, User, LayoutDashboard } from "lucide-react";
import { NavLink } from "./NavLink";
import { userAuthStore } from "@/store/authStore";

const BottomNav = () => {
  const { user } = userAuthStore();

  const navItems = user?.type === "doctor"
    ? [
        { icon: LayoutDashboard, label: "Dashboard", path: "/doctor/dashboard" },
        { icon: Calendar, label: "Appointments", path: "/doctor/appointments" },
        { icon: User, label: "Profile", path: "/profile" },
      ]
    : [
        { icon: Home, label: "Home", path: "/home" },
        { icon: Search, label: "Explore", path: "/explore" },
        { icon: Calendar, label: "Bookings", path: "/bookings" },
        { icon: User, label: "Profile", path: "/profile" },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 text-muted-foreground transition-smooth"
              activeClassName="text-primary"
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
