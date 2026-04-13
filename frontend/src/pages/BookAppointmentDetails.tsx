import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import AppointmentHeader from '@/components/AppointmentHeader';
import { useDoctorStore } from "@/store/doctorStore";

const BookAppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentDoctor, fetchDoctorById } = useDoctorStore();
  const [symptoms, setSymptoms] = useState("");

  useEffect(() => {
    if (id) fetchDoctorById(id).catch(() => {});
  }, [id, fetchDoctorById]);

  const slot = (location.state as any)?.slot as string | undefined;

  const handleContinue = () => {
    navigate(`/book-appointment/${id}/payment`, { state: { slot, symptoms } });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppointmentHeader doctor={currentDoctor} step={2} stepperPosition="right" />

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
            <h3 className="font-semibold mb-3">Selected Slot</h3>
            <div className="text-sm text-muted-foreground mb-6">{slot ? new Date(slot).toLocaleString() : 'No slot selected'}</div>

            <h3 className="font-semibold mb-2">Enter Symptoms / Notes</h3>
            <textarea className="w-full p-3 border border-border rounded mb-4" rows={6} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />

            <div className="flex gap-2 justify-between">
              <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
              <Button onClick={handleContinue} disabled={!slot}>Continue to Payment</Button>
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default BookAppointmentDetails;
