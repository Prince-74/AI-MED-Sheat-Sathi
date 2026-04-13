import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useAppointmentStore } from "@/store/appointmentStore";
import { userAuthStore } from "@/store/authStore";

const Bookings = () => {
  const { user } = userAuthStore();
  const role: "doctor" | "patient" = user?.type === "doctor" ? "doctor" : "patient";
  const { appointments, fetchAppointments, loading } = useAppointmentStore();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    fetchAppointments(role, tab).catch(() => {});
  }, [role, tab, fetchAppointments]);

  const counts = useMemo(() => {
    const upcoming = appointments.filter(a => a.status === "Scheduled" || a.status === "In Progress").length;
    const past = appointments.filter(a => a.status === "Completed" || a.status === "Cancelled").length;
    return { upcoming, past };
  }, [appointments]);

  return (
    <div className="min-h-screen bg-background pb-24 px-6 pt-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage your healthcare bookings</p>
        </div>
        <div>
          <Button onClick={() => window.location.href = '/pharmacy'}>Book New Booking</Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex gap-3 bg-card p-2 rounded-full w-full max-w-xl">
          <button
            className={`flex-1 px-3 py-2 rounded-full text-sm ${tab === 'upcoming' ? 'bg-white shadow' : 'text-muted-foreground'}`}
            onClick={() => setTab('upcoming')}
          >
            🕘 Upcoming ({counts.upcoming})
          </button>
          <button
            className={`flex-1 px-3 py-2 rounded-full text-sm ${tab === 'past' ? 'bg-white shadow' : 'text-muted-foreground'}`}
            onClick={() => setTab('past')}
          >
            📅 Past ({counts.past})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      ) : (tab === 'upcoming' ? appointments.filter(a => a.status === 'Scheduled' || a.status === 'In Progress') : appointments.filter(a => a.status === 'Completed' || a.status === 'Cancelled')).length > 0 ? (
        <div className="space-y-3">
          {(tab === 'upcoming' ? appointments.filter(a => a.status === 'Scheduled' || a.status === 'In Progress') : appointments.filter(a => a.status === 'Completed' || a.status === 'Cancelled')).map((apt) => (
            <Card key={apt._id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm truncate">{apt.doctorId?.name || (apt.doctorId && apt.doctorId.toString()) || "Doctor"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(apt.slotStartIso).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{apt.consultationType} • ₹{apt.fees || "-"}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-xs px-2 py-1 rounded-full bg-secondary">{apt.status}</div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center border-0 shadow-sm">
          <div className="mx-auto max-w-2xl">
            <div className="text-4xl text-muted-foreground mb-4">🕘</div>
            <h3 className="text-lg font-semibold mb-2">No {tab === 'upcoming' ? 'Upcoming' : 'Past'} Bookings</h3>
            <p className="text-sm text-muted-foreground mb-4">You don't have any {tab === 'upcoming' ? 'upcoming' : 'past'} bookings scheduled.</p>
            <div className="flex justify-center">
              <Button onClick={() => window.location.href = '/pharmacy'}>Book Your First Booking</Button>
            </div>
          </div>
        </Card>
      )}

      <BottomNav />
    </div>
  );
};

export default Bookings;
