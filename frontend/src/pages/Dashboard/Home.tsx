import {
  Bell,
  Search,
  Stethoscope,
  Phone,
  FolderOpen,
  Upload,
  MessageCircle,
  Pill,
  Calendar,
  Clock,
  Video,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DoctorCard from "@/components/DoctorCard";
import { useEffect, useState } from "react";
import { useDoctorStore } from "@/store/doctorStore";
import { userAuthStore } from "@/store/authStore";
import BottomNav from "@/components/BottomNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useNavigate, Link } from "react-router-dom";
import doctorMale from "@/assets/doctor-male.jpg";
import { getWithAuth } from "@/service/httpService";

const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;

const quickActions = [
  { icon: Stethoscope, label: "Check Symptoms", path: "/symptom-checker", color: "text-sky-500" },
  { icon: Upload, label: "Upload Report", path: "/report-analyzer", color: "text-green-500" },
  { icon: Phone, label: "Consult Doctor", path: "/doctors", color: "text-blue-500" },
  { icon: Pill, label: "Find Medicines", path: "/pharmacy", color: "text-purple-500" },
  { icon: FolderOpen, label: "My Records", path: "/health-records", color: "text-orange-500" },
] as const;

interface PatientDashboardData {
  nextAppointment?: any;
  upcomingAppointments?: any[];
  recentCompleted?: any[];
  stats?: {
    upcomingCount: number;
    completedCount: number;
    totalAppointments: number;
  };
}

const Home = () => {
  const navigate = useNavigate();
  const { user } = userAuthStore();
  const { doctors, fetchDoctors, loading: doctorsLoading } = useDoctorStore();

  const [dashboardData, setDashboardData] = useState<PatientDashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    fetchDoctors().catch(() => {});

    if (user?.type === "patient") {
      getWithAuth<PatientDashboardData>("/patient/dashboard")
        .then((res) => setDashboardData(res.data))
        .catch(() => {})
        .finally(() => setDashboardLoading(false));
    } else {
      setDashboardLoading(false);
    }
  }, [fetchDoctors, user]);

  const nextApt = dashboardData?.nextAppointment;

  const isJoinable =
    nextApt &&
    (nextApt.status === "CONFIRMED" ||
      nextApt.status === "UPCOMING" ||
      nextApt.status === "IN_PROGRESS" ||
      nextApt.status === "Scheduled");

  const isAudio =
    nextApt?.consultationType === "Voice Call" || nextApt?.consultationType === "AUDIO";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Banner */}
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
          <p className="text-sm opacity-90 mb-1">Hello, {user?.name || "Patient"}</p>
          <h1 className="text-xl font-bold mb-1">Welcome Back ??</h1>
          <p className="text-xs opacity-80">Stay healthy, stay connected</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search doctors, medicines, tests..."
            className="h-12 pl-12 rounded-2xl bg-card text-foreground border-0"
            onClick={() => navigate("/doctors")}
          />
        </div>
      </div>

      {/* Next Appointment / Active Consultation Banner */}
      <div className="px-6 mt-6">
        {nextApt ? (
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/70 border-2 border-primary/30 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-primary text-white rounded-lg">
                  <Calendar className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-primary">
                  Next Scheduled Consultation
                </span>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">
                {nextApt.status}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Dr. {nextApt.doctorId?.name || "Doctor"}
                </h3>
                <p className="text-xs text-primary font-medium">
                  {nextApt.doctorId?.specialization || "Specialist"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {nextApt.doctorId?.hospitalInfo?.name || "Clinic"}
                </p>
              </div>

              <div className="text-right text-xs">
                <div className="font-semibold text-foreground flex items-center justify-end gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {nextApt.slotStartIso
                    ? new Date(nextApt.slotStartIso).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {nextApt.slotStartIso
                    ? new Date(nextApt.slotStartIso).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {isJoinable && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white flex-1 text-xs"
                  onClick={() => navigate(`/call/${nextApt._id}`)}
                >
                  {isAudio ? <Phone className="w-3.5 h-3.5 mr-1.5" /> : <Video className="w-3.5 h-3.5 mr-1.5" />}
                  Join Consultation
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1"
                onClick={() => navigate(`/appointments/${nextApt._id}`)}
              >
                View Details
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-muted/30 border border-dashed flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">No Upcoming Appointments</p>
              <p className="text-[11px] text-muted-foreground">Book a consultation with top specialists</p>
            </div>
            <Button size="sm" onClick={() => navigate("/doctors")} className="text-xs">
              Book Doctor
            </Button>
          </Card>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="px-6 mt-6">
        <h2 className="text-lg font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {quickActions.map((action, idx) => (
            <Card
              key={idx}
              className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-card-hover transition-smooth"
              onClick={() => navigate(action.path)}
            >
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <span className="text-xs text-center font-medium leading-tight">{action.label}</span>
            </Card>
          ))}

          {/* Telegram Bot */}
          {botUsername ? (
            <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">
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
              title="Telegram bot not configured"
            >
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-sky-600" />
              </div>
              <span className="text-xs text-center font-medium leading-tight">Telegram Bot</span>
            </Card>
          )}
        </div>

        {/* Health Tip Card */}
        <Card className="p-4 mb-6 bg-green-light border-l-4 border-l-accent">
          <p className="text-sm font-semibold text-accent mb-1">?? Health Tip of the Day</p>
          <p className="text-xs text-muted-foreground">
            Drink at least 8 glasses of water daily and take 10-minute movement breaks while working.
          </p>
        </Card>
      </div>

      {/* Top Doctors Section */}
      <div className="px-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Available Specialists</h2>
          <button onClick={() => navigate("/doctors")} className="text-xs text-primary font-semibold">
            See all ?
          </button>
        </div>

        <div className="space-y-3">
          {doctorsLoading ? (
            <div className="space-y-2">
              <div className="h-20 bg-muted animate-pulse rounded-xl" />
              <div className="h-20 bg-muted animate-pulse rounded-xl" />
            </div>
          ) : doctors && doctors.length > 0 ? (
            doctors.slice(0, 4).map((d) => (
              <DoctorCard
                key={d._id}
                id={d._id}
                name={d.name}
                specialty={d.specialization || "General Physician"}
                image={d.profileImage || doctorMale}
                rating={4.9}
                location={d.hospitalInfo?.name || d.hospitalInfo?.city || "Clinic"}
                onClick={() => navigate(`/doctor/${d._id}`)}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No doctors available currently.</p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
