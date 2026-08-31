import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import AppointmentHeader from "@/components/AppointmentHeader";
import { useDoctorStore } from "@/store/doctorStore";
import { Calendar, Clock, Video, Phone, FileText } from "lucide-react";

import { formatSlotDate, formatSlotTimeSimple } from "@/lib/dateUtils";

const BookAppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentDoctor, fetchDoctorById } = useDoctorStore();
  const [symptoms, setSymptoms] = useState("");

  useEffect(() => {
    if (id) fetchDoctorById(id).catch(() => {});
  }, [id, fetchDoctorById]);

  const { slot, slotEndIso, date, consultationType = "Video Consultation" } =
    (location.state as any) || {};

  const handleContinue = () => {
    navigate(`/book-appointment/${id}/payment`, {
      state: {
        slot,
        slotEndIso,
        date,
        consultationType,
        symptoms,
      },
    });
  };

  const doctorFee = currentDoctor?.fees !== undefined ? currentDoctor.fees : 500;

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppointmentHeader doctor={currentDoctor} step={2} />

      <div className="px-4 sm:px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Doctor Card */}
        <div className="lg:col-span-1 w-full">
          <Card className="p-6 w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                {currentDoctor?.name?.slice(0, 1)}
              </div>
              <div>
                <div className="font-bold text-base">{currentDoctor?.name}</div>
                <div className="text-xs text-primary font-medium">{currentDoctor?.specialization}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{currentDoctor?.hospitalInfo?.name}</div>
              </div>
            </div>

            <div className="p-3 bg-secondary/50 rounded-xl">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Fee per consultation</div>
              <div className="text-lg font-bold text-accent">₹{doctorFee}</div>
            </div>
          </Card>
        </div>

        {/* Right Side: Appointment Details and Medical Notes */}
        <div className="lg:col-span-2 w-full">
          <Card className="p-6 w-full shadow-md space-y-5">
            <h3 className="font-bold text-base border-b pb-2">Selected Consultation Slot</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 p-4 rounded-xl border">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <div className="text-[11px] text-muted-foreground">Date</div>
                  <div className="text-xs font-semibold">
                    {formatSlotDate(date || slot)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <div className="text-[11px] text-muted-foreground">Time</div>
                  <div className="text-xs font-semibold">
                    {slot ? formatSlotTimeSimple(slot) : "-"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {consultationType === "Voice Call" ? (
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <Video className="w-4 h-4 text-primary shrink-0" />
                )}
                <div>
                  <div className="text-[11px] text-muted-foreground">Type</div>
                  <div className="text-xs font-semibold">{consultationType}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <FileText className="w-4 h-4 text-primary" />
                <span>Symptoms / Reason for Visit (Optional)</span>
              </div>
              <textarea
                className="w-full p-3.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card"
                rows={4}
                placeholder="Describe any symptoms, previous treatments, or specific questions for the doctor..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-between">
              <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
                Back
              </Button>
              <Button onClick={handleContinue} disabled={!slot} className="w-full sm:w-auto px-8">
                Continue to Review & Confirm
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default BookAppointmentDetails;
