import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import BottomNav from "@/components/BottomNav";
import AppointmentHeader from "@/components/AppointmentHeader";
import { useDoctorStore } from "@/store/doctorStore";
import { useAppointmentStore, Slot } from "@/store/appointmentStore";
import { Video, Phone, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { formatLocalDate } from "@/lib/dateUtils";

const BookAppointment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentDoctor, fetchDoctorById } = useDoctorStore();
  const { fetchDoctorAvailability, availability, loading: loadingSlots } = useAppointmentStore();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [consultationType, setConsultationType] = useState<"Video Consultation" | "Voice Call">("Video Consultation");

  useEffect(() => {
    if (id) fetchDoctorById(id).catch(() => {});
  }, [id, fetchDoctorById]);

  // Load authoritative backend slot availability whenever selected doctor or date changes
  useEffect(() => {
    if (!currentDoctor || !selectedDate) return;
    const dateString = formatLocalDate(selectedDate);
    setSelectedSlot(null);
    fetchDoctorAvailability(currentDoctor._id, dateString);
  }, [currentDoctor, selectedDate, fetchDoctorAvailability]);

  const handleContinueToDetails = () => {
    if (!currentDoctor || !selectedSlot || !selectedDate) {
      toast.error("Please select a date and an available time slot");
      return;
    }

    const dateString = formatLocalDate(selectedDate);

    navigate(`/book-appointment/${currentDoctor._id}/details`, {
      state: {
        slot: selectedSlot.slotStartIso,
        slotEndIso: selectedSlot.slotEndIso,
        date: dateString,
        consultationType,
      },
    });
  };

  const doctor = currentDoctor;
  const availableSlots = availability?.slots || [];
  const bookableSlots = availableSlots.filter((s) => s.available);

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppointmentHeader doctor={doctor} step={1} />

      <div className="px-4 sm:px-6 mt-6 sm:mt-6 flex flex-col lg:flex-row gap-6">
        {/* Left Side: Doctor Card */}
        <div className="w-full lg:w-1/3">
          <Card className="p-6">
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold mb-4 ring-4 ring-primary/20">
                {doctor?.name?.slice(0, 1)}
              </div>
              <div className="text-lg font-bold text-foreground">{doctor?.name}</div>
              <div className="text-sm font-medium text-primary">{doctor?.specialization}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {doctor?.experience ? `${doctor.experience} years experience` : "Certified Specialist"}
              </div>

              <div className="mt-4 w-full p-3.5 bg-secondary/50 rounded-xl space-y-1">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Consultation Fee</div>
                <div className="text-xl font-bold text-accent">₹{doctor?.fees !== undefined ? doctor.fees : 500}</div>
                <div className="text-xs text-muted-foreground">
                  {availability?.slotDuration || 30} mins session duration
                </div>
              </div>

              {doctor?.hospitalInfo?.name && (
                <div className="mt-4 w-full text-xs text-muted-foreground bg-card p-3 rounded-lg border border-border/60">
                  <div className="font-semibold text-foreground mb-0.5">{doctor.hospitalInfo.name}</div>
                  <div>{doctor.hospitalInfo.city}</div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Side: Date, Consultation Type, and Authoritative Slot Picker */}
        <div className="w-full lg:flex-1">
          <Card className="p-6 shadow-md border border-border/70">
            {/* Consultation Type Selector */}
            <div className="mb-6">
              <h3 className="font-semibold text-sm mb-3">1. Select Consultation Type</h3>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setConsultationType("Video Consultation")}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                    consultationType === "Video Consultation"
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Video className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-sm">Video Call</div>
                    <div className="text-[11px] opacity-80">HD Video Consultation</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConsultationType("Voice Call")}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                    consultationType === "Voice Call"
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Phone className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-sm">Voice Call</div>
                    <div className="text-[11px] opacity-80">Audio Consultation</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Date & Authoritative Slot Availability */}
            <div className="flex flex-col md:flex-row gap-6 pt-4 border-t border-border">
              <div className="w-full md:w-1/2">
                <h3 className="font-semibold text-sm mb-3">2. Select Consultation Date</h3>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  className="rounded-xl border border-border shadow-sm p-3"
                />
              </div>

              <div className="w-full md:flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">3. Available Time Slots</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {bookableSlots.length} available
                  </span>
                </div>

                {loadingSlots ? (
                  <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                    Checking doctor availability...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-6 bg-muted/40 rounded-xl text-center space-y-2 border border-dashed border-border">
                    <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto" />
                    <p className="text-sm font-semibold">No Slots Available</p>
                    <p className="text-xs text-muted-foreground">
                      The doctor is not accepting appointments on this date. Please pick another day.
                    </p>
                  </div>
                ) : (
                  <>
                    {bookableSlots.length === 0 && (
                      <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>
                          All slots for this date have concluded or are fully booked. Please select tomorrow or another future date on the calendar.
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.slotStartIso === slot.slotStartIso;
                      return (
                        <button
                          key={slot.slotStartIso}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-2.5 rounded-xl text-xs font-medium border flex flex-col items-center justify-center transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/30"
                              : slot.available
                              ? "bg-card hover:border-primary/60 border-border text-foreground hover:bg-primary/5"
                              : "bg-muted/40 text-muted-foreground/50 border-border/40 cursor-not-allowed line-through"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{slot.startTime}</span>
                          </div>
                          <span className="text-[10px] mt-0.5 opacity-75">
                            {slot.isBooked ? "Booked" : slot.isPast ? "Past" : "Available"}
                          </span>
                        </button>
                      );
                    })}
                    </div>
                  </>
                )}

                <div className="mt-6 pt-4 border-t border-border flex justify-end">
                  <Button
                    disabled={!selectedSlot || loadingSlots}
                    onClick={handleContinueToDetails}
                    className="w-full sm:w-auto px-8"
                  >
                    Continue to Details
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default BookAppointment;
