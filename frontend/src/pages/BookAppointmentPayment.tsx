import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useDoctorStore } from "@/store/doctorStore";
import { useAppointmentStore } from "@/store/appointmentStore";
import { usePaymentStore, PaymentOrder } from "@/store/paymentStore";
import AppointmentHeader from "@/components/AppointmentHeader";
import {
  ShieldCheck,
  Video,
  Phone,
  Calendar,
  Clock,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { formatSlotDate, formatSlotTimeSimple } from "@/lib/dateUtils";

const BookAppointmentPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentDoctor, fetchDoctorById } = useDoctorStore();
  const { bookAppointment } = useAppointmentStore();
  const { createPaymentOrder, verifyPayment, loading: paymentLoading } = usePaymentStore();

  const [createdAppointment, setCreatedAppointment] = useState<any | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string>("");

  useEffect(() => {
    if (id) fetchDoctorById(id).catch(() => {});
  }, [id, fetchDoctorById]);

  const { slot, slotEndIso, date, consultationType = "Video Consultation", symptoms } =
    (location.state as any) || {};

  const doctorFee = currentDoctor?.fees !== undefined ? currentDoctor.fees : 500;

  // Step 1: Initiate Booking & Payment Order
  const handleInitiatePayment = async () => {
    if (!currentDoctor || !slot) {
      toast.error("Invalid booking information. Please select your slot again.");
      navigate(`/book-appointment/${id}`);
      return;
    }

    setProcessing(true);
    setPaymentFailed(false);
    try {
      const startIso = slot;
      const calculatedEndIso =
        slotEndIso ||
        new Date(new Date(startIso).getTime() + (currentDoctor.slotDurationMinutes || 30) * 60000).toISOString();

      // Create PENDING appointment
      const payload = {
        doctorId: currentDoctor._id,
        slotStartIso: startIso,
        slotEndIso: calculatedEndIso,
        consultationType,
        symptoms: symptoms || "",
        date: date || (startIso ? startIso.slice(0, 10) : ""),
        consultationFees: doctorFee,
        platformFees: 0,
        totalAmount: doctorFee,
      };

      const apt = await bookAppointment(payload);
      setCreatedAppointment(apt);

      // Create Payment Order for this appointment
      const order = await createPaymentOrder(apt._id);
      setPaymentOrder(order);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to initiate booking";

      if (err?.response?.status === 409 || errMsg.toLowerCase().includes("no longer available")) {
        toast.error("This slot was just taken by another patient. Please choose another slot.", {
          duration: 5000,
        });
        navigate(`/book-appointment/${id}`, { replace: true });
      } else {
        toast.error(errMsg);
      }
    } finally {
      setProcessing(false);
    }
  };

  // Step 2: Handle Payment Verification (Success / Failure / Cancel)
  const handleSimulatePayment = async (action: "SUCCESS" | "FAILURE" | "CANCEL") => {
    if (!paymentOrder || !createdAppointment) return;

    setProcessing(true);
    try {
      const res = await verifyPayment({
        orderId: paymentOrder.orderId,
        result: action,
        metadata: action === "FAILURE" ? { failureReason: "Simulated card decline / insufficient balance" } : {},
      });

      if (action === "SUCCESS" && res.success) {
        toast.success("Payment verified and appointment confirmed!");
        navigate(`/booking-confirmation/${createdAppointment._id}`, {
          state: {
            appointment: res.appointment || createdAppointment,
            receipt: res.receipt,
          },
          replace: true,
        });
        return;
      }

      if (action === "FAILURE") {
        setPaymentFailed(true);
        setFailureMessage(res.message || "Simulated payment failure. Your appointment has NOT been confirmed.");
        toast.error("Payment failed. Your appointment remains unconfirmed.");
      } else if (action === "CANCEL") {
        toast.info("Payment was cancelled.");
        setPaymentOrder(null);
      }
    } catch (err: any) {
      setPaymentFailed(true);
      const msg = err?.response?.data?.message || err?.message || "Payment verification failed";
      setFailureMessage(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppointmentHeader doctor={currentDoctor} step={3} />

      <div className="px-4 sm:px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Doctor Card */}
        <div className="lg:col-span-1 w-full">
          <Card className="p-6 w-full space-y-3">
            <div className="font-bold text-base">{currentDoctor?.name}</div>
            <div className="text-sm text-primary">{currentDoctor?.specialization}</div>
            <div className="text-xs text-muted-foreground">
              {currentDoctor?.hospitalInfo?.name}, {currentDoctor?.hospitalInfo?.city}
            </div>
            <div className="pt-3 border-t text-sm font-semibold flex justify-between">
              <span>Consultation Fee</span>
              <span className="text-accent font-bold">₹{doctorFee}</span>
            </div>
          </Card>
        </div>

        {/* Right Side: Booking Summary & Interactive Payment Gateway */}
        <div className="lg:col-span-2 w-full space-y-4">
          {!paymentOrder ? (
            /* Summary Card before opening Payment Modal/Order */
            <Card className="p-6 w-full shadow-md space-y-5">
              <h3 className="font-bold text-base border-b pb-2">Booking Summary</h3>

              <div className="bg-secondary/40 p-4 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Date & Time
                  </span>
                  <span className="font-medium text-foreground">
                    {slot
                      ? `${formatSlotDate(date || slot)}, ${formatSlotTimeSimple(slot)}`
                      : "-"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    {consultationType === "Voice Call" ? <Phone className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                    Consultation Mode
                  </span>
                  <span className="font-medium text-foreground">{consultationType}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Duration
                  </span>
                  <span className="font-medium text-foreground">
                    {currentDoctor?.slotDurationMinutes || 30} minutes
                  </span>
                </div>

                {symptoms && (
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="font-medium text-foreground max-w-xs truncate">{symptoms}</span>
                  </div>
                )}

                <div className="flex justify-between mt-3 border-t pt-3 text-sm font-bold">
                  <span>Total Amount Due</span>
                  <span className="text-accent text-base">₹{doctorFee}</span>
                </div>
              </div>

              <div className="bg-primary/5 p-3.5 rounded-xl border border-primary/20 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-foreground">Secure Payment Gateway</div>
                  <div className="text-muted-foreground">Your payment will be verified directly by backend</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-between">
                <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
                  Back
                </Button>
                <Button
                  onClick={handleInitiatePayment}
                  disabled={processing || !slot}
                  className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto px-8"
                >
                  {processing ? "Preparing Payment..." : `Proceed to Payment (₹${doctorFee})`}
                </Button>
              </div>
            </Card>
          ) : (
            /* Interactive Temporary Payment Screen */
            <Card className="p-6 w-full shadow-lg border-2 border-primary/40 space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Temporary Payment Provider</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Mock Provider (Easily replaceable with Razorpay)
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  DEMO / TEST MODE
                </span>
              </div>

              {paymentFailed && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>Payment Failed</span>
                  </div>
                  <p className="text-xs text-red-700">{failureMessage}</p>
                </div>
              )}

              {/* Order Metadata Box */}
              <div className="p-4 bg-muted/50 rounded-xl space-y-2 text-xs border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Reference:</span>
                  <span className="font-mono font-semibold text-foreground">{paymentOrder.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctor:</span>
                  <span className="font-semibold text-foreground">{paymentOrder.doctor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-accent text-sm">
                    ?{paymentOrder.amount} {paymentOrder.currency}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Success, Failure, Cancel */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase text-center">
                  Select payment test action:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleSimulatePayment("SUCCESS")}
                    disabled={processing || paymentLoading}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-sm flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Pay Now (Simulate Success)
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleSimulatePayment("FAILURE")}
                    disabled={processing || paymentLoading}
                    className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 font-semibold py-6 text-sm flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5 text-red-600" />
                    Simulate Payment Failure
                  </Button>
                </div>

                <div className="pt-2 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSimulatePayment("CANCEL")}
                    disabled={processing || paymentLoading}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel Payment & Return
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default BookAppointmentPayment;
