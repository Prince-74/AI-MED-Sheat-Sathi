import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useAppointmentStore, Appointment } from "@/store/appointmentStore";
import { userAuthStore } from "@/store/authStore";
import {
  Calendar,
  Clock,
  Video,
  Phone,
  ArrowLeft,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { toast } from "sonner";

const AppointmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = userAuthStore();
  const {
    fetchAppointmentById,
    acceptAppointment,
    rejectAppointment,
    cancelAppointment,
    loading,
    error,
  } = useAppointmentStore();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchAppointmentById(id).then((apt) => {
      if (apt) setAppointment(apt);
    });
  }, [id, fetchAppointmentById]);

  const isDoctor = user?.type === "doctor";
  const isPatient = user?.type === "patient";

  const handleAccept = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await acceptAppointment(id);
      toast.success("Appointment confirmed!");
      const updated = await fetchAppointmentById(id);
      if (updated) setAppointment(updated);
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept appointment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    const reason = prompt("Enter rejection reason (optional):") || "";
    setActionLoading(true);
    try {
      await rejectAppointment(id, reason);
      toast.success("Appointment rejected");
      const updated = await fetchAppointmentById(id);
      if (updated) setAppointment(updated);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject appointment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    const reason = prompt("Enter cancellation reason:") || "Cancelled by user";
    setActionLoading(true);
    try {
      await cancelAppointment(id, reason);
      toast.success("Appointment cancelled");
      const updated = await fetchAppointmentById(id);
      if (updated) setAppointment(updated);
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel appointment");
    } finally {
      setActionLoading(false);
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

  if (loading && !appointment) {
    return (
      <>
        <Header showDashboardNav={true} />
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        </div>
      </>
    );
  }

  if (error || !appointment) {
    return (
      <>
        <Header showDashboardNav={true} />
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <Card className="p-8 max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Appointment Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error || "You are not authorized to view this appointment or it does not exist."}
            </p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </Card>
        </div>
      </>
    );
  }

  const doctorName = appointment.doctorId?.name || "Doctor";
  const patientName = appointment.patientId?.name || "Patient";
  const isAudio =
    appointment.consultationType === "Voice Call" || appointment.consultationType === "AUDIO";

  const isJoinable =
    appointment.status === "CONFIRMED" ||
    appointment.status === "UPCOMING" ||
    appointment.status === "IN_PROGRESS" ||
    appointment.status === "Scheduled";

  const isCancellable =
    appointment.status === "CONFIRMED" ||
    appointment.status === "PENDING" ||
    appointment.status === "Scheduled";

  return (
    <>
      <Header showDashboardNav={true} />

      <div className="min-h-screen bg-background pb-24 pt-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Back Nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Appointments
            </button>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase border ${getBadgeStyle(
                appointment.status
              )}`}
            >
              {appointment.status}
            </span>
          </div>

          <Card className="p-6 shadow-md border space-y-6">
            {/* Header: Doctor & Patient Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b">
              {/* Doctor Card */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Assigned Doctor</p>
                <h3 className="font-bold text-base text-foreground">Dr. {doctorName}</h3>
                <p className="text-xs text-primary font-medium">
                  {appointment.doctorId?.specialization || "Specialist"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {appointment.doctorId?.hospitalInfo?.name || "Clinic"}
                </p>
              </div>

              {/* Patient Card */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Patient Details</p>
                <h3 className="font-bold text-base text-foreground">{patientName}</h3>
                {appointment.patientId?.email && (
                  <p className="text-xs text-muted-foreground">{appointment.patientId.email}</p>
                )}
                {appointment.patientId?.phone && (
                  <p className="text-xs text-muted-foreground">Phone: {appointment.patientId.phone}</p>
                )}
              </div>
            </div>

            {/* Schedule & Consultation Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-xl text-xs border">
              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Date
                </span>
                <span className="font-semibold text-foreground block text-sm">
                  {appointment.slotStartIso
                    ? new Date(appointment.slotStartIso).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "-"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Time Slot
                </span>
                <span className="font-semibold text-foreground block text-sm">
                  {appointment.slotStartIso
                    ? new Date(appointment.slotStartIso).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  {isAudio ? (
                    <Phone className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Video className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  Mode
                </span>
                <span className="font-semibold text-foreground block text-sm">
                  {appointment.consultationType || "Video Consultation"}
                </span>
              </div>
            </div>

            {/* Symptoms & Clinical Notes */}
            {appointment.symptoms && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">
                  Reason for Visit / Symptoms:
                </h4>
                <p className="text-xs bg-secondary/30 p-3 rounded-xl text-foreground">
                  {appointment.symptoms}
                </p>
              </div>
            )}

            {/* Prescriptions / Doctor Notes (If Completed) */}
            {appointment.prescription && (
              <div className="space-y-2 p-4 bg-green-50 border border-green-200 rounded-xl">
                <h4 className="text-xs font-bold text-green-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-green-700" /> Doctor Prescription & Advice:
                </h4>
                <p className="text-xs text-green-800 whitespace-pre-wrap">{appointment.prescription}</p>
                {appointment.notes && (
                  <p className="text-[11px] text-green-700 italic border-t pt-1.5">
                    Notes: {appointment.notes}
                  </p>
                )}
              </div>
            )}

            {/* Payment & Fee Summary */}
            <div className="p-3.5 bg-muted/30 rounded-xl border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>
                  Payment Status:{" "}
                  <strong className="text-green-700">{appointment.paymentStatus || "Paid"}</strong>
                </span>
              </div>
              <div className="font-bold text-accent text-sm">
                ?{appointment.totalAmount || appointment.consultationFees || 0}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {/* Doctor Pending Accept / Reject */}
              {isDoctor && appointment.status === "PENDING" && (
                <>
                  <Button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Accept & Confirm
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="text-red-600 hover:bg-red-50 flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </>
              )}

              {/* Join Consultation */}
              {isJoinable && (
                <Button
                  onClick={() => navigate(`/call/${appointment._id}`)}
                  className="bg-primary hover:bg-primary/90 text-white flex-1"
                >
                  <Video className="w-4 h-4 mr-2" /> Join Consultation Room
                </Button>
              )}

              {/* Cancellation */}
              {isCancellable && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="text-red-600 hover:bg-red-50 text-xs sm:w-auto"
                >
                  Cancel Appointment
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </>
  );
};

export default AppointmentDetails;
