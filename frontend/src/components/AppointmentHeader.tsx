import React from 'react';
import { useNavigate } from 'react-router-dom';

type DoctorMeta = {
  name?: string;
  specialization?: string;
  experience?: number;
};

interface Props {
  doctor?: DoctorMeta;
  step?: 1 | 2 | 3;
  onBack?: () => void;
  stepperPosition?: 'center' | 'right';
}

const AppointmentHeader: React.FC<Props> = ({ doctor, step = 1, onBack, stepperPosition }) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) return onBack();
    navigate('/doctors');
  };

  const stepItem = (num: number, label: string) => {
    const active = step === num;
    return (
      <div className={`flex items-center gap-3 ${active ? '' : 'opacity-60'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? 'bg-white text-primary' : 'bg-card text-muted-foreground'} font-semibold`}>{num}</div>
        <div className="text-sm">{label}</div>
      </div>
    );
  };

  const pos = stepperPosition || 'center';
  // make stepper right-aligned on large screens, centered on small screens when position is 'right'
  const stepperWrapperClass = pos === 'center'
    ? 'absolute left-1/2 transform -translate-x-1/2 -top-3'
    : 'absolute lg:right-6 right-1/2 lg:transform-none transform -translate-x-1/2 -top-3';

  return (
    <div>
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <button onClick={handleBack} className="text-sm text-muted-foreground">&larr; Back to Doctors</button>
            <div>
              <div className="text-lg font-semibold">Book Appointment</div>
              <div className="text-xs text-muted-foreground">with {doctor?.name}</div>
            </div>
          </div>
          <div />
        </div>
      </div>

      <div className="relative">
        <div className={stepperWrapperClass}>
          <div className="flex items-center gap-3 sm:gap-6 bg-primary text-primary-foreground px-3 sm:px-5 py-1 sm:py-2 rounded-full shadow-lg">
            {stepItem(1, 'Select Time')}
            <div className="w-px h-6 bg-white/40" />
            {stepItem(2, 'Details')}
            <div className="w-px h-6 bg-white/40" />
            {stepItem(3, 'Payment')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentHeader;
