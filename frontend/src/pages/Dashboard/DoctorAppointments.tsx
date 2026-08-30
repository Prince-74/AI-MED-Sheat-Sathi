import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
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
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

const DoctorAppointments = () => {
  const navigate = useNavigate();
  const { user } = userAuthStore();
  const {
    appointments,
    fetchAppointments,
    acceptAppointment,
    rejectAppointment,
    cancelAppointment,
    loading,
  } = useAppointmentStore();

  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "PENDING" | "UPCOMING" | "COMPLETED" | "CANCELLED"
  >("UPCOMING");

  useEffect(() => {
    if (user?.type === "doctor") {
      fetchAppointments("doctor").catch(() => {});
    }
  }, [fetchAppointments, user]);

  const counts = useMemo(() => {
    const pending = appointments.filter((a) => a.status === "PENDING").length;
    const upcoming = appointments.filter(
      (a) =>
        a.status === "CONFIRMED" ||
        a.status === "UPCOMING" ||
        a.status === "IN_PROGRESS" ||
        a.status === "Scheduled"
    ).length;
    const completed = appointments.filter(
      (a) => a.status === "COMPLETED" || a.status === "Completed"
    ).length;
    const cancelled = appointments.filter(
      (a) => a.status === "CANCELLED" || a.status === "Cancelled" || a.status === "REJECTED"
    ).length;

    return { all: appointments.length, pending, upcoming, completed, cancelled };
  }, [appointments]);

  const displayedAppointments = useMemo(() => {
    switch (activeFilter) {
      case "PENDING":
        return appointments.filter((a) => a.status === "PENDING");
      case "UPCOMING":
        return appointments.filter(
          (a) =>
            a.status === "CONFIRMED" ||
            a.status === "UPCOMING" ||
            a.status === "IN_PROGRESS" ||
            a.status === "Scheduled"
        );
      case "COMPLETED":
        return appointments.filter(
          (a) => a.status === "COMPLETED" || a.status === "Completed"
        );
      case "CANCELLED":
        return appointments.filter(
          (a) => a.status === "CANCELLED" || a.status === "Cancelled" || a.status === "REJECTED"
        );
      default:
        return appointments;
    }
  }, [appointments, activeFilter]);

  const handleAccept = async (id: string) => {
    try {
      await acceptAppointment(id);
      toast.success("Appointment request accepted & confirmed");
      fetchAppointments("doctor");
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept appointment");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason (optional):") || "";
    try {
      await rejectAppointment(id, reason);
      toast.success("Appointment rejected");
      fetchAppointments("doctor");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject appointment");
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt("Enter cancellation reason:") || "Cancelled by doctor";
    try {
      await cancelAppointment(id, reason);
      toast.success("Appointment cancelled");
      fetchAppointments("doctor");
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
    <>
      <Header showDashboardNav={true} />
      <div className="min-h-screen bg-background pb-24 pt-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">Doctor Appointments Queue</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage your patient schedule, reviews, and active consultations
              </p>
            </div>
            <Button size="sm" onClick={() => fetchAppointments("doctor")} variant="outline">
              Refresh Queue
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 bg-muted/60 p-1.5 rounded-xl text-xs">
            <button
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === "UPCOMING"
                  ? "bg-card text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveFilter("UPCOMING")}
            >
              Upcoming ({counts.upcoming})
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === "PENDING"
                  ? "bg-card text-foreground shadow-sm font-bold text-amber-800"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveFilter("PENDING")}
            >
              Pending Approval ({counts.pending})
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === "COMPLETED"
                  ? "bg-card text-foreground shadow-sm font-bold text-green-800"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveFilter("COMPLETED")}
            >
              Completed ({counts.completed})
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === "CANCELLED"
                  ? "bg-card text-foreground shadow-sm font-bold text-red-800"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveFilter("CANCELLED")}
            >
              Cancelled ({counts.cancelled})
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === "ALL"
                  ? "bg-card text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveFilter("ALL")}
            >
              All ({counts.all})
            </button>
          </div>

          {/* Appointment Cards List */}
          {loading ? (
            <div className="space-y-3">
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
            </div>
          ) : displayedAppointments.length > 0 ? (
            <div className="space-y-4">
              {displayedAppointments.map((apt: Appointment) => {
                const patientName =
                  apt.patientId?.name ||
                  (typeof apt.patientId === "object" ? apt.patientId?.name : "Patient");

                const isJoinable =
                  apt.status === "CONFIRMED" ||
                  apt.status === "UPCOMING" ||
                  apt.status === "IN_PROGRESS" ||
                  apt.status === "Scheduled";

                const isAudio =
                  apt.consultationType === "Voice Call" || apt.consultationType === "AUDIO";

                return (
                  <Card
                    key={apt._id}
                    className="p-5 border border-border/70 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-foreground">{patientName}</h3>
                            {apt.patientId?.age && (
                              <span className="text-xs text-muted-foreground">
                                ({apt.patientId.age} yrs)
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${getBadgeStyle(
                              apt.status
                            )}`}
                          >
                            {apt.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {apt.slotStartIso
                              ? new Date(apt.slotStartIso).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "-"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {apt.slotStartIso
                              ? new Date(apt.slotStartIso).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </span>
                          <span className="flex items-center gap-1">
                            {isAudio ? (
                              <Phone className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Video className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            <span>{apt.consultationType || "Video Consultation"}</span>
                          </span>
                        </div>

                        {apt.symptoms && (
                          <p className="text-xs text-muted-foreground line-clamp-1 bg-secondary/40 p-1.5 rounded-lg">
                            <span className="font-semibold text-foreground">Symptoms:</span>{" "}
                            {apt.symptoms}
                          </p>
                        )}

                        {apt.prescription && (
                          <p className="text-xs text-green-700 bg-green-50 p-1.5 rounded-lg border border-green-200">
                            <span className="font-semibold">Prescription:</span> {apt.prescription}
                          </p>
                        )}
                      </div>

                      <div className="flex sm:flex-col gap-2 shrink-0">
                        {apt.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-xs w-full"
                              onClick={() => handleAccept(apt._id)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 text-xs w-full"
                              onClick={() => handleReject(apt._id)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}

                        {isJoinable && (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/call/${apt._id}`)}
                            className="bg-primary hover:bg-primary/90 text-white text-xs w-full"
                          >
                            <Video className="w-3.5 h-3.5 mr-1.5" />
                            Start Call
                          </Button>
                        )}

                        <Link to={`/appointments/${apt._id}`} className="w-full">
                          <Button size="sm" variant="outline" className="w-full text-xs">
                            Details
                          </Button>
                        </Link>

                        {(apt.status === "CONFIRMED" || apt.status === "Scheduled") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 text-xs w-full"
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
              <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="text-base font-semibold mb-1">No appointments in this category</h3>
              <p className="text-xs text-muted-foreground">
                There are no {activeFilter.toLowerCase()} consultations to display right now.
              </p>
            </Card>
          )}
        </div>
      </div>
      <BottomNav />
    </>
  );
};

export default DoctorAppointments;
