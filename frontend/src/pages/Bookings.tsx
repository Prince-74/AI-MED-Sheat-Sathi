import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useAppointmentStore } from "@/store/appointmentStore";
import { userAuthStore } from "@/store/authStore";

const Bookings = () => {
  const { user } = userAuthStore();
  const role: "doctor" | "patient" = user?.type === "doctor" ? "doctor" : "patient";
  const { appointments, fetchAppointments, loading } = useAppointmentStore();
  const [tab, setTab] = useState<"upcoming" | "past" | "all">("upcoming");

  useEffect(() => {
    fetchAppointments(role, tab).catch(() => {});
  }, [role, tab, fetchAppointments]);

  return (
    <div className="min-h-screen bg-background pb-24 px-6 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Bookings</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant={tab === "upcoming" ? undefined : "ghost"} onClick={() => setTab("upcoming")}>Upcoming</Button>
        <Button variant={tab === "past" ? undefined : "ghost"} onClick={() => setTab("past")}>Past</Button>
        <Button variant={tab === "all" ? undefined : "ghost"} onClick={() => setTab("all")}>All</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      ) : appointments && appointments.length > 0 ? (
        <div className="space-y-3">
          {appointments.map((apt) => (
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
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">No bookings found.</div>
        </Card>
      )}

      <BottomNav />
    </div>
  );
};

export default Bookings;
