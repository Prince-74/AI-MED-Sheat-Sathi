import { Bell, Search, Stethoscope, FileText, Pill, Phone, FolderOpen, Upload, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DoctorCard from "@/components/DoctorCard";
import BottomNav from "@/components/BottomNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useNavigate } from "react-router-dom";
import doctorFemale from "@/assets/doctor-female.jpg";
import doctorMale from "@/assets/doctor-male.jpg";

const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;

const quickActions = [
  { icon: Stethoscope, label: "Check Symptoms", path: "/symptom-checker", color: "text-sky-500" },
  { icon: Upload, label: "Upload Report", path: "/report-analyzer", color: "text-green-500" },
  { icon: Phone, label: "Consult Doctor", path: "/home", color: "text-blue-500" },
  { icon: Pill, label: "Find Medicines", path: "/pharmacy", color: "text-purple-500" },
  { icon: FolderOpen, label: "My Records", path: "/health-records", color: "text-orange-500" },
  
] as const;

const doctors = [
  {
    id: "1",
    name: "Dr. Yasmine",
    specialty: "Cardiologist",
    image: doctorFemale,
    rating: 4.8,
    location: "New York Medical Center",
    distance: "2.5km",
  },
  {
    id: "2",
    name: "Dr. Michael",
    specialty: "Neurologist",
    image: doctorMale,
    rating: 4.9,
    location: "City Health Clinic",
    distance: "1.8km",
  },
  {
    id: "3",
    name: "Dr. Sarah",
    specialty: "Pediatrician",
    image: doctorFemale,
    rating: 4.7,
    location: "Children's Hospital",
    distance: "3.2km",
  },
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground px-6 pt-8 pb-6 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-lg font-bold">AI-MED</p>
            <p className="text-xs opacity-90">Accessible Intelligent Medicine</p>
          </div>
          <button className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center hover:bg-primary-foreground/30 transition-smooth">
            <Bell className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-4">
          <LanguageSwitcher />
        </div>

        <div className="bg-primary-foreground/20 rounded-2xl p-4 mb-4">
          <p className="text-sm opacity-90 mb-1">Hello,</p>
          <h1 className="text-xl font-bold mb-2">Welcome Back 👋</h1>
          <p className="text-xs opacity-80">Stay healthy, stay connected</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search doctors, medicines..."
            className="h-12 pl-12 rounded-2xl bg-card text-foreground border-0"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 mt-6">
        <h2 className="text-lg font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {quickActions.map((action, idx) => (
            <Card
              key={idx}
              className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-card-hover transition-smooth"
              onClick={() => navigate(action.path)}
            >
              <div className={`w-12 h-12 bg-secondary rounded-full flex items-center justify-center`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <span className="text-xs text-center font-medium leading-tight">{action.label}</span>
            </Card>
          ))}
          {/* Telegram Bot card: show always; make it a link when botUsername is configured */}
          {botUsername ? (
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noreferrer"
            >
              <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-card-hover transition-smooth">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-sky-600" />
                </div>
                <span className="text-xs text-center font-medium leading-tight">Telegram Bot</span>
              </Card>
            </a>
          ) : (
            <Card
              className="p-4 flex flex-col items-center gap-2 opacity-60 cursor-not-allowed"
              title="Telegram bot not configured. Set VITE_TELEGRAM_BOT_USERNAME in your .env"
            >
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-sky-600" />
              </div>
              <span className="text-xs text-center font-medium leading-tight">Telegram Bot (not configured)</span>
            </Card>
          )}
        </div>

        {/* Health Tip */}
        <Card className="p-4 mb-6 bg-green-light border-l-4 border-l-accent">
          <p className="text-sm font-semibold text-accent mb-1">💡 Health Tip of the Day</p>
          <p className="text-sm text-muted-foreground">
            Drink at least 8 glasses of water daily to stay hydrated and healthy!
          </p>
        </Card>
      </div>

      {/* Top Doctors */}
      <div className="px-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Top Doctors</h2>
          <button className="text-sm text-primary font-medium">See all</button>
        </div>

        <div className="space-y-4">
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              {...doctor}
              onClick={() => navigate(`/doctor/${doctor.id}`)}
            />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
