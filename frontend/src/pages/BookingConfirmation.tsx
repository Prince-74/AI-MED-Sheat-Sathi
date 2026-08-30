import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useAppointmentStore, Appointment } from "@/store/appointmentStore";
import { usePaymentStore, Receipt } from "@/store/paymentStore";
import {
  CheckCircle2,
  Calendar,
  Clock,
  Video,
  Phone,
  Receipt as ReceiptIcon,
  Printer,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const BookingConfirmation = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { fetchAppointmentById } = useAppointmentStore();
  const { fetchPaymentByAppointment } = usePaymentStore();

  const stateData = location.state as { appointment?: Appointment; receipt?: Receipt } | undefined;

  const [appointment, setAppointment] = useState<any | null>(stateData?.appointment || null);
  const [receipt, setReceipt] = useState<Receipt | null>(stateData?.receipt || null);
  const [loading, setLoading] = useState(!stateData?.appointment);

  useEffect(() => {
    if (!appointmentId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const apt = await fetchAppointmentById(appointmentId);
        if (apt) setAppointment(apt);

        const payment = await fetchPaymentByAppointment(appointmentId);
        if (payment && payment.receiptId) {
          setReceipt({
            receiptId: payment.receiptId,
            paymentId: payment._id,
            orderId: payment.providerOrderId,
            providerPaymentId: payment.providerPaymentId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            paidAt: payment.paidAt || payment.updatedAt,
            provider: payment.provider,
            patient: {
              id: payment.patientId?._id || payment.patientId,
              name: payment.patientId?.name || "Patient",
              email: payment.patientId?.email,
            },
            doctor: {
              id: payment.doctorId?._id || payment.doctorId,
              name: payment.doctorId?.name || "Doctor",
              specialization: payment.doctorId?.specialization,
              hospital: payment.doctorId?.hospitalInfo?.name,
            },
            appointment: {
              id: apt?._id || appointmentId,
              date: apt?.dateString || "",
              slotStartIso: apt?.slotStartIso || "",
              slotEndIso: apt?.slotEndIso || "",
              consultationType: apt?.consultationType || "Video Consultation",
              status: apt?.status || "CONFIRMED",
            },
          });
        }
      } catch (err) {
        console.error("Failed to load confirmed appointment details", err);
      } finally {
        setLoading(false);
      }
    };

    if (!stateData?.appointment || !stateData?.receipt) {
      loadData();
    }
  }, [appointmentId]);

  const handlePrint = () => {
    window.print();
  };

  const doctorName = appointment?.doctorId?.name || "Doctor";
  const doctorSpecialization = appointment?.doctorId?.specialization || "Specialist";
  const isAudio =
    appointment?.consultationType === "Voice Call" || appointment?.consultationType === "AUDIO";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Loading confirmation details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Confirmation Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Appointment Confirmed!</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Your payment has been successfully processed and verified.
          </p>
        </div>

        {/* Main Appointment & Receipt Card */}
        <Card className="p-6 shadow-lg border border-border/80 space-y-6">
          {/* Doctor Info Banner */}
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center shrink-0">
              {doctorName?.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-base text-foreground truncate">Dr. {doctorName}</h2>
              <p className="text-xs text-primary font-medium">{doctorSpecialization}</p>
              <p className="text-[11px] text-muted-foreground">
                {appointment?.doctorId?.hospitalInfo?.name || "Medical Clinic"}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-green-100 text-green-800 border border-green-300">
              CONFIRMED
            </span>
          </div>

          {/* Schedule & Consultation Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl text-xs border">
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Date
              </span>
              <span className="font-semibold text-foreground block text-sm">
                {appointment?.slotStartIso
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
                <Clock className="w-3.5 h-3.5 text-primary" /> Time
              </span>
              <span className="font-semibold text-foreground block text-sm">
                {appointment?.slotStartIso
                  ? new Date(appointment.slotStartIso).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                {isAudio ? <Phone className="w-3.5 h-3.5 text-primary" /> : <Video className="w-3.5 h-3.5 text-primary" />}
                Mode
              </span>
              <span className="font-semibold text-foreground block">
                {appointment?.consultationType || "Video Consultation"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Payment Status
              </span>
              <span className="font-semibold text-green-700 block">
                Paid (?{appointment?.totalAmount || appointment?.consultationFees || 0})
              </span>
            </div>
          </div>

          {/* Digital Receipt Summary */}
          {receipt && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <ReceiptIcon className="w-4 h-4 text-primary" /> Digital Receipt
                </h3>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Receipt #{receipt.receiptId}
                </span>
              </div>

              <div className="p-3.5 bg-secondary/30 rounded-xl space-y-2 text-xs border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono text-foreground">{receipt.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Ref:</span>
                  <span className="font-mono text-foreground">{receipt.providerPaymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-semibold text-foreground">{receipt.provider}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-sm">
                  <span>Total Amount Paid:</span>
                  <span className="text-accent">
                    ?{receipt.amount} {receipt.currency}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </Button>
            <Button
              onClick={() => navigate("/bookings")}
              className="w-full sm:w-1/2 bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2"
            >
              View My Consultations <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default BookingConfirmation;
