import React from "react";
import { useNavigate } from "react-router-dom";

type DoctorMeta = {
  name?: string;
  specialization?: string;
  experience?: number;
};

interface Props {
  doctor?: DoctorMeta;
  step?: 1 | 2 | 3;
  onBack?: () => void;
  stepperPosition?: "center" | "right";
}

const AppointmentHeader: React.FC<Props> = ({
  doctor,
  step = 1,
  onBack,
  stepperPosition,
}) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) return onBack();
    navigate("/doctors");
  };

  const stepItem = (num: number, label: string) => {
    const active = step === num;
    return (
      <div className={`flex items-center gap-3 ${active ? "" : "opacity-60"}`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? "bg-white text-primary" : "bg-card text-muted-foreground"} font-semibold`}
        >
          {num}
        </div>
        <div className="text-sm">{label}</div>
      </div>
    );
  };

  // Render the header and keep the stepper in-flow so it doesn't overlap page content.
  return (
    <div>
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="text-sm text-muted-foreground"
              >
                &larr; Back to Doctors
              </button>
              <div>
                <div className="text-lg font-semibold">Book Appointment</div>
                <div className="text-xs text-muted-foreground">
                  with {doctor?.name}
                </div>
              </div>
            </div>

            {/* Right-aligned stepper on large screens */}
            <div className="hidden lg:block">
              <div className="flex items-center gap-6 bg-primary text-primary-foreground px-5 py-2 rounded-full shadow-lg">
                {stepItem(1, "Select Time")}
                <div className="w-px h-6 bg-white/40" />
                {stepItem(2, "Details")}
                <div className="w-px h-6 bg-white/40" />
                {stepItem(3, "Payment")}
              </div>
            </div>
          </div>

          {/* Centered stepper on small screens (below header) */}
          <div className="mt-3 flex justify-center lg:hidden">
            <div className="flex items-center gap-3 bg-primary text-primary-foreground px-3 py-1 rounded-full shadow-lg text-xs">
              {stepItem(1, "Select")}
              <div className="w-px h-5 bg-white/40" />
              {stepItem(2, "Details")}
              <div className="w-px h-5 bg-white/40" />
              {stepItem(3, "Pay")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentHeader;
