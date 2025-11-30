import React from "react";
import { Heart, LogOut } from "lucide-react";
import { userAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  showDashboardNav?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showDashboardNav }) => {
  const navigate = useNavigate();
  const { user, logout } = userAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-md z-40 px-6 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <Heart className="w-6 h-6 text-blue-600" />
        <h1 className="text-lg font-semibold text-gray-900">AI-MED</h1>
      </div>

      {showDashboardNav && (
        <div className="flex items-center space-x-4 text-sm text-gray-700">
          <nav className="flex space-x-6">
            <a href="/doctor/dashboard" className="hover:text-blue-600">Dashboard</a>
            <a href="/doctor/appointments" className="hover:text-blue-600">Appointments</a>
            <a href="/profile" className="hover:text-blue-600">Profile</a>
          </nav>
          <div className="flex items-center gap-3">
            {user && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
