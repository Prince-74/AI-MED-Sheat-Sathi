import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useDoctorStore } from "@/store/doctorStore";
import { useAppointmentStore } from "@/store/appointmentStore";
import AppointmentHeader from '@/components/AppointmentHeader';

const BookAppointmentPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentDoctor, fetchDoctorById } = useDoctorStore();
  const { bookAppointment } = useAppointmentStore();

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) fetchDoctorById(id).catch(() => {});
  }, [id, fetchDoctorById]);

  const { slot, symptoms } = (location.state as any) || {};

  const handlePayAndBook = async () => {
    if (!currentDoctor || !slot) return;
    setProcessing(true);
    try {
      const startIso = slot;
      const slotMinutes = currentDoctor.slotDurationMinutes || 30;
      const endIso = new Date(new Date(startIso).getTime() + slotMinutes * 60000).toISOString();
      const payload = {
        doctorId: currentDoctor._id,
        slotStartIso: startIso,
        slotEndIso: endIso,
        consultationType: "Video Consultation",
        symptoms: symptoms || "",
        date: startIso.slice(0, 10),
        consultationFees: currentDoctor.fees || 0,
        platformFees: 0,
        totalAmount: currentDoctor.fees || 0,
      };
      await bookAppointment(payload);
      navigate('/bookings');
    } catch (err) {
      console.error(err);
      alert('Payment or booking failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppointmentHeader doctor={currentDoctor} step={3} stepperPosition="right" />

      <div className="px-6 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="font-semibold">{currentDoctor?.name}</div>
            <div className="text-sm text-muted-foreground">{currentDoctor?.specialization}</div>
            <div className="mt-4 text-sm">Consultation Fee: ₹{currentDoctor?.fees || 0}</div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Booking Summary</h3>
            <div className="bg-card p-4 rounded mb-4">
              <div className="flex justify-between"><div className="text-sm">Date & Time</div><div className="text-sm">{slot ? new Date(slot).toLocaleString() : '-'}</div></div>
              <div className="flex justify-between mt-2"><div className="text-sm">Consultation Type</div><div className="text-sm">Video Consultation</div></div>
              <div className="flex justify-between mt-2"><div className="text-sm">Doctor</div><div className="text-sm">{currentDoctor?.name}</div></div>
              <div className="flex justify-between mt-2"><div className="text-sm">Duration</div><div className="text-sm">{currentDoctor?.slotDurationMinutes || 30} minutes</div></div>
              <div className="flex justify-between mt-3 border-t pt-3 font-semibold"><div>Total Amount</div><div className="text-accent">₹{currentDoctor?.fees || 0}</div></div>
            </div>

            <div className="bg-accent/10 p-4 rounded mb-4">
              <div className="font-semibold">Secure Payment</div>
              <div className="text-sm text-muted-foreground">Your payment is protected by 256-bit SSL encryption</div>
            </div>

            <div className="flex gap-2 justify-between">
              <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
              <Button onClick={handlePayAndBook} disabled={processing} className="bg-green-600">{processing ? 'Processing...' : `Pay ₹${currentDoctor?.fees || 0} & Book`}</Button>
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default BookAppointmentPayment;
