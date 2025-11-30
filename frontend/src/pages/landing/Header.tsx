import React from "react";
import { Heart } from "lucide-react";

interface HeaderProps {
  showDashboardNav?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showDashboardNav }) => {
  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-md z-40 px-6 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <Heart className="w-6 h-6 text-blue-600" />
        <h1 className="text-lg font-semibold text-gray-900">AI-MED</h1>
      </div>

      {showDashboardNav && (
        <nav className="flex space-x-6 text-sm text-gray-700">
          <a href="/doctor/dashboard" className="hover:text-blue-600">Dashboard</a>
          <a href="/doctor/appointments" className="hover:text-blue-600">Appointments</a>
          <a href="/doctor/profile" className="hover:text-blue-600">Profile</a>
        </nav>
      )}
    </header>
  );
};

export default Header;
