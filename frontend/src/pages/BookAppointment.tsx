import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import BottomNav from "@/components/BottomNav";
import AppointmentHeader from '@/components/AppointmentHeader';
import { useDoctorStore } from "@/store/doctorStore";
import { useAppointmentStore } from "@/store/appointmentStore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function addMinutes(date: Date, mins: number) {
  return new Date(date.getTime() + mins * 60000);
}

const BookAppointment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentDoctor, fetchDoctorById } = useDoctorStore();
  const { fetchBookedSlots, bookAppointment } = useAppointmentStore();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (id) fetchDoctorById(id).catch(() => {});
  }, [id, fetchDoctorById]);

  useEffect(() => {
    if (!currentDoctor || !selectedDate) return;
    const isoDate = selectedDate.toISOString().slice(0, 10);
    setLoadingSlots(true);
    fetchBookedSlots(currentDoctor._id, isoDate)
      .then((_) => {
        // compute slots based on doctor's dailyTimeRanges
        const ranges = currentDoctor.dailyTimeRanges || [];
        const slotMinutes = currentDoctor.slotDurationMinutes || 30;
        const daySlots: string[] = [];
        for (const r of ranges) {
          const [h1, m1] = r.start.split(":").map(Number);
          const [h2, m2] = r.end.split(":").map(Number);
          let cursor = new Date(selectedDate);
          cursor.setHours(h1, m1, 0, 0);
          const end = new Date(selectedDate);
          end.setHours(h2, m2, 0, 0);
          while (cursor < end) {
            daySlots.push(cursor.toISOString());
            cursor = addMinutes(cursor, slotMinutes);
          }
        }
        // naive: don't remove booked slots here -- backend fetchBookedSlots could be used later to filter
        setAvailableSlots(daySlots);
      })
      .catch(() => setAvailableSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [currentDoctor, selectedDate, fetchBookedSlots]);

  const handleContinueToDetails = () => {
    if (!currentDoctor || !selectedSlot) return;
    // navigate to details step and pass selected slot via state
    navigate(`/book-appointment/${currentDoctor._id}/details`, { state: { slot: selectedSlot } });
  };

  const doctor = currentDoctor;

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppointmentHeader doctor={doctor} step={1} stepperPosition="right" />

      <div className="px-4 sm:px-6 mt-10 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/3">
          <Card className="p-6">
            <div className="flex flex-col items-center">
              <div className="w-36 h-36 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold mb-4">{doctor?.name?.slice(0,1)}</div>
              <div className="text-lg font-semibold">{doctor?.name}</div>
              <div className="text-sm text-muted-foreground">{doctor?.specialization}</div>
              <div className="text-sm text-muted-foreground">{doctor?.experience} years experience</div>

              <div className="mt-4 flex gap-2 flex-wrap justify-center">
                <span className="text-xs px-2 py-1 rounded bg-accent/10 text-accent">Verified</span>
                <span className="text-xs px-2 py-1 rounded bg-card text-muted-foreground">{doctor?.specialization}</span>
              </div>

              <div className="mt-6 w-full">
                <h4 className="text-sm font-semibold mb-2">About</h4>
                <div className="p-3 bg-card rounded text-sm text-muted-foreground">{doctor?.about || '—'}</div>
              </div>

              <div className="mt-4 w-full">
                <h4 className="text-sm font-semibold mb-2">Hospital / Clinic</h4>
                <div className="p-3 bg-card rounded text-sm text-muted-foreground">{doctor?.hospitalInfo?.name}<div className="text-xs">{doctor?.hospitalInfo?.city}</div></div>
              </div>

              <div className="mt-6 w-full p-3 rounded bg-accent/10">
                <div className="text-sm text-muted-foreground">Consultation Fee</div>
                <div className="font-semibold text-accent text-lg">₹{doctor?.fees || 0}</div>
                <div className="text-xs text-muted-foreground">30 minutes session</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="w-full lg:flex-1">
          <Card className="p-6 bg-white shadow-lg">
            <div className="flex gap-6">
              <div className="w-1/2">
                <h3 className="font-semibold mb-3">Select Date & Time</h3>
                <Calendar mode="single" selected={selectedDate} onSelect={(d) => setSelectedDate(d || undefined)} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Available Time Slots</h3>
                  <div className="text-sm text-muted-foreground">{availableSlots.length} slots available</div>
                </div>
                {loadingSlots ? (
                  <div>Loading slots...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No slots available for selected day.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {availableSlots.map((iso) => (
                      <button
                        key={iso}
                        onClick={() => setSelectedSlot(iso)}
                        className={`px-4 py-3 rounded-lg border ${selectedSlot === iso ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border'}`}
                      >
                        {new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button disabled={!selectedSlot} onClick={handleContinueToDetails} className="bg-primary">Continue</Button>
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
