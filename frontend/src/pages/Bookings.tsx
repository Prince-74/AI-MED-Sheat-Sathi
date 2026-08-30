import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useAppointmentStore, Appointment } from "@/store/appointmentStore";
import { userAuthStore } from "@/store/authStore";
import { useNavigate, Link } from "react-router-dom";
import {
  Video,
  Phone,
  Calendar,
  Clock,
  User,
  XCircle,
  AlertCircle,
  FileText,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { toast } from "sonner";

const Bookings = () => {
  const navigate = useNavigate();
  const { user } = userAuthStore();
  const role: "doctor" | "patient" = user?.type === "doctor" ? "doctor" : "patient";
  const { appointments, fetchAppointments, cancelAppointment, loading } = useAppointmentStore();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    fetchAppointments(role, tab).catch(() => {});
  }, [role, tab, fetchAppointments]);

  const counts = useMemo(() => {
    const upcoming = appointments.filter(
      (a) =>
        a.status === "CONFIRMED" ||
        a.status === "UPCOMING" ||
        a.status === "IN_PROGRESS" ||
        a.status === "PENDING" ||
        a.status === "Scheduled"
    ).length;

    const past = appointments.filter(
      (a) =>
        a.status === "COMPLETED" ||
        a.status === "CANCELLED" ||
        a.status === "REJECTED"
    ).length;

    return { upcoming, past };
  }, [appointments]);

  const displayedAppointments = useMemo(() => {
    return tab === "upcoming"
      ? appointments.filter(
          (a) =>
            a.status === "CONFIRMED" ||
            a.status === "UPCOMING" ||
            a.status === "IN_PROGRESS" ||
            a.status === "PENDING" ||
            a.status === "Scheduled"
        )
      : appointments.filter(
          (a) =>
            a.status === "COMPLETED" ||
            a.status === "CANCELLED" ||
            a.status === "REJECTED"
        );
  }, [appointments, tab]);

  const handleCancel = async (appointmentId: string) => {
    const reason = prompt("Enter cancellation reason:") || "Cancelled by patient";
    if (!reason) return;
    try {
      await cancelAppointment(appointmentId, reason);
      toast.success("Appointment successfully cancelled");
      fetchAppointments(role, tab);
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel appointment");
    }
  };

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
      case "In Progress":
        return "bg-amber-100 text-amber-800 border-amber-300 animate-pulse";
      case "CONFIRMED":
      case "Scheduled":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "COMPLETED":
      case "Completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "CANCELLED":
      case "Cancelled":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 px-4 sm:px-6 pt-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">My Consultations</h1>
          <p className="text-sm text-muted-foreground">Manage your scheduled telehealth appointments</p>
        </div>
        <div>
          <Button onClick={() => navigate("/doctors")}>Book Doctor</Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-2 bg-muted p-1.5 rounded-xl w-full max-w-md">
          <button
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "upcoming" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("upcoming")}
          >
            ?? Upcoming ({counts.upcoming})
          </button>
          <button
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "past" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("past")}
          >
            ? Past ({counts.past})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 bg-muted animate-pulse rounded-xl" />
          <div className="h-24 bg-muted animate-pulse rounded-xl" />
        </div>
      ) : displayedAppointments.length > 0 ? (
        <div className="space-y-4">
          {displayedAppointments.map((apt: Appointment) => {
            const doctorName =
              apt.doctorId?.name || (typeof apt.doctorId === "object" ? apt.doctorId?.name : "Doctor");

            const isJoinable =
              apt.status === "CONFIRMED" ||
              apt.status === "UPCOMING" ||
              apt.status === "IN_PROGRESS" ||
              apt.status === "Scheduled";

            const isCancellable =
              apt.status === "CONFIRMED" ||
              apt.status === "PENDING" ||
              apt.status === "Scheduled";

            const isAudio =
              apt.consultationType === "Voice Call" || apt.consultationType === "AUDIO";

            return (
              <Card key={apt._id} className="p-5 border border-border/70 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base">Dr. {doctorName}</h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${getBadgeStyle(
                          apt.status
                        )}`}
                      >
                        {apt.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {apt.slotStartIso
                          ? new Date(apt.slotStartIso).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })
                          : "-"}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {apt.slotStartIso
                          ? new Date(apt.slotStartIso).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </div>
                      <div className="flex items-center gap-1">
                        {isAudio ? (
                          <Phone className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Video className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{apt.consultationType || "Video Consultation"}</span>
                      </div>
                      <div className="font-semibold text-accent">
                        ?{apt.consultationFees || apt.totalAmount || 0}
                      </div>
                    </div>

                    {apt.symptoms && (
                      <p className="text-xs text-muted-foreground line-clamp-1 bg-secondary/40 p-1.5 rounded-lg">
                        <span className="font-semibold text-foreground">Symptoms:</span> {apt.symptoms}
                      </p>
                    )}

                    {apt.cancelReason && (
                      <p className="text-xs text-red-600">
                        <span className="font-semibold">Cancellation reason:</span> {apt.cancelReason}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    {isJoinable && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto text-xs"
                        onClick={() => navigate(`/call/${apt._id}`)}
                      >
                        {isAudio ? <Phone className="w-3.5 h-3.5 mr-1" /> : <Video className="w-3.5 h-3.5 mr-1" />}
                        Join Call
                      </Button>
                    )}

                    <Link to={`/appointments/${apt._id}`} className="w-full sm:w-auto">
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        View Details
                      </Button>
                    </Link>

                    {isCancellable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 w-full sm:w-auto text-xs"
                        onClick={() => handleCancel(apt._id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center border-0 shadow-sm">
          <div className="mx-auto max-w-md">
            <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-semibold mb-1">
              No {tab === "upcoming" ? "Upcoming" : "Past"} Consultations
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              You do not have any {tab === "upcoming" ? "active scheduled" : "past"} appointments.
            </p>
            <Button size="sm" onClick={() => navigate("/doctors")}>
              Find & Book a Doctor
            </Button>
          </div>
        </Card>
      )}

      <BottomNav />
    </div>
  );
};

export default Bookings;
