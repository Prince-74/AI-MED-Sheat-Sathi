import { getWithAuth, postWithAuth, putWithAuth } from "@/service/httpService";
import { create } from "zustand";

export interface Slot {
  startTime: string;
  endTime: string;
  slotStartIso: string;
  slotEndIso: string;
  available: boolean;
  isPast?: boolean;
  isBooked?: boolean;
}

export interface DoctorAvailability {
  date: string;
  doctorId: string;
  doctorName?: string;
  slotDuration: number;
  totalSlots: number;
  availableSlots: number;
  slots: Slot[];
}

export interface Appointment {
  _id: string;
  doctorId: any;
  patientId: any;
  date: string;
  dateString?: string;
  slotStartIso: string;
  slotEndIso: string;
  consultationType: "Video Consultation" | "Voice Call" | "VIDEO" | "AUDIO";
  status:
    | "PENDING"
    | "CONFIRMED"
    | "UPCOMING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED"
    | "Scheduled";
  symptoms: string;
  zegoRoomId: string;
  consultationFees: number;
  platformFees?: number;
  totalAmount: number;
  prescription?: string;
  notes?: string;
  cancelledBy?: string;
  cancelReason?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentFilters {
  status?: string | string[];
  from?: string;
  to?: string;
  date?: string;
  sortBy?: "date" | "createdAt" | "status";
  sortOrder?: "asc" | "desc";
}

interface BookingData {
  doctorId: string;
  slotStartIso: string;
  slotEndIso: string;
  consultationType?: string;
  symptoms?: string;
  date?: string;
  consultationFees?: number;
  platformFees?: number;
  totalAmount?: number;
}

interface AppointmentState {
  appointments: Appointment[];
  bookedSlots: string[];
  availability: DoctorAvailability | null;
  currentAppointment: Appointment | null;
  loading: boolean;
  error: string | null;

  // Actions
  clearError: () => void;
  setCurrentAppointment: (appointment: Appointment | null) => void;

  // API Actions
  fetchAppointments: (
    role: "doctor" | "patient",
    tab?: string,
    filters?: AppointmentFilters
  ) => Promise<void>;
  fetchDoctorAvailability: (
    doctorId: string,
    dateString: string
  ) => Promise<DoctorAvailability | null>;
  fetchBookedSlots: (doctorId: string, date: string) => Promise<void>;
  fetchAppointmentById: (appointmentId: string) => Promise<Appointment | null>;
  bookAppointment: (data: BookingData) => Promise<any>;
  acceptAppointment: (appointmentId: string) => Promise<void>;
  rejectAppointment: (appointmentId: string, reason?: string) => Promise<void>;
  cancelAppointment: (appointmentId: string, reason?: string) => Promise<void>;
  joinConsultation: (appointmentId: string) => Promise<any>;
  endConsultation: (
    appointmentId: string,
    prescription?: string,
    notes?: string
  ) => Promise<void>;
  updateAppointmentStatus: (
    appointmentId: string,
    status: string,
    reason?: string
  ) => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  bookedSlots: [],
  availability: null,
  currentAppointment: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  setCurrentAppointment: (appointment) =>
    set({ currentAppointment: appointment }),

  fetchAppointments: async (role, tab = "", filters = {}) => {
    set({ loading: true, error: null });
    try {
      const endPoint =
        role === "doctor" ? "/appointment/doctor" : "/appointment/patient";
      const queryParams = new URLSearchParams();

      if (tab === "upcoming") {
        queryParams.append("status", "CONFIRMED");
        queryParams.append("status", "UPCOMING");
        queryParams.append("status", "IN_PROGRESS");
        queryParams.append("status", "PENDING");
        queryParams.append("status", "Scheduled");
      } else if (tab === "past") {
        queryParams.append("status", "COMPLETED");
        queryParams.append("status", "CANCELLED");
        queryParams.append("status", "REJECTED");
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          key !== "status"
        ) {
          if (Array.isArray(value)) {
            value.forEach((v) => queryParams.append(key, v.toString()));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });

      const response = await getWithAuth(`${endPoint}?${queryParams.toString()}`);
      set({ appointments: response.data || [] });
    } catch (error: any) {
      set({ error: error?.message || "Failed to fetch appointments" });
    } finally {
      set({ loading: false });
    }
  },

  fetchDoctorAvailability: async (doctorId, dateString) => {
    set({ loading: true, error: null });
    try {
      const response = await getWithAuth(
        `/appointment/availability/${doctorId}?date=${encodeURIComponent(dateString)}`
      );
      const data = response?.data as DoctorAvailability;
      set({ availability: data });
      return data;
    } catch (error: any) {
      set({ error: error?.message || "Failed to fetch doctor availability" });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchAppointmentById: async (appointmentId) => {
    set({ loading: true, error: null });
    try {
      const response = await getWithAuth(`/appointment/${appointmentId}`);
      const apt = response?.data?.appointment || response?.data;
      set({ currentAppointment: apt });
      return apt;
    } catch (error: any) {
      set({ error: error?.message || "Failed to fetch appointment" });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchBookedSlots: async (doctorId, date) => {
    set({ loading: true, error: null });
    try {
      const response = await getWithAuth(
        `/appointment/booked-slots/${doctorId}/${date}`
      );
      set({ bookedSlots: response?.data || [] });
    } catch (error: any) {
      set({ error: error?.message || "Failed to fetch booked slots" });
    } finally {
      set({ loading: false });
    }
  },

  bookAppointment: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await postWithAuth("/appointment/book", data);
      const newApt = response?.data?.appointment || response.data;
      set((state) => ({
        appointments: [newApt, ...state.appointments],
        currentAppointment: newApt,
      }));
      return newApt;
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to book appointment";
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  acceptAppointment: async (appointmentId) => {
    set({ loading: true, error: null });
    try {
      const response = await putWithAuth(`/appointment/${appointmentId}/accept`, {});
      const updated = response?.data;
      set((state) => ({
        appointments: state.appointments.map((a) =>
          a._id === appointmentId ? { ...a, status: "CONFIRMED" } : a
        ),
        currentAppointment:
          state.currentAppointment?._id === appointmentId
            ? { ...state.currentAppointment, status: "CONFIRMED" }
            : state.currentAppointment,
      }));
    } catch (error: any) {
      set({ error: error?.message || "Failed to accept appointment" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  rejectAppointment: async (appointmentId, reason = "") => {
    set({ loading: true, error: null });
    try {
      const response = await putWithAuth(`/appointment/${appointmentId}/reject`, { reason });
      set((state) => ({
        appointments: state.appointments.map((a) =>
          a._id === appointmentId ? { ...a, status: "REJECTED", rejectReason: reason } : a
        ),
        currentAppointment:
          state.currentAppointment?._id === appointmentId
            ? { ...state.currentAppointment, status: "REJECTED", rejectReason: reason }
            : state.currentAppointment,
      }));
    } catch (error: any) {
      set({ error: error?.message || "Failed to reject appointment" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  cancelAppointment: async (appointmentId, reason = "") => {
    set({ loading: true, error: null });
    try {
      await putWithAuth(`/appointment/${appointmentId}/cancel`, { reason });
      set((state) => ({
        appointments: state.appointments.map((a) =>
          a._id === appointmentId ? { ...a, status: "CANCELLED", cancelReason: reason } : a
        ),
        currentAppointment:
          state.currentAppointment?._id === appointmentId
            ? { ...state.currentAppointment, status: "CANCELLED", cancelReason: reason }
            : state.currentAppointment,
      }));
    } catch (error: any) {
      set({ error: error?.message || "Failed to cancel appointment" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  joinConsultation: async (appointmentId) => {
    set({ loading: true, error: null });
    try {
      const response = await getWithAuth(`/appointment/join/${appointmentId}`);
      set((state) => ({
        appointments: state.appointments.map((apt) =>
          apt._id === appointmentId ? { ...apt, status: "IN_PROGRESS" } : apt
        ),
        currentAppointment:
          state.currentAppointment?._id === appointmentId
            ? { ...state.currentAppointment, status: "IN_PROGRESS" }
            : state.currentAppointment,
      }));

      return response.data;
    } catch (error: any) {
      set({ error: error?.message || "Failed to join consultation" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  endConsultation: async (appointmentId, prescription, notes) => {
    set({ loading: true, error: null });
    try {
      const response = await putWithAuth(`/appointment/end/${appointmentId}`, {
        prescription,
        notes,
      });
      set((state) => ({
        appointments: state.appointments.map((apt) =>
          apt._id === appointmentId ? { ...apt, status: "COMPLETED" } : apt
        ),
        currentAppointment:
          state.currentAppointment?._id === appointmentId
            ? { ...state.currentAppointment, status: "COMPLETED" }
            : state.currentAppointment,
      }));

      return response.data;
    } catch (error: any) {
      set({ error: error?.message || "Failed to end consultation" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateAppointmentStatus: async (appointmentId, status, reason = "") => {
    set({ loading: true, error: null });
    try {
      const response = await putWithAuth(`/appointment/status/${appointmentId}`, { status, reason });
      set((state) => ({
        appointments: state.appointments.map((apt) =>
          apt._id === appointmentId ? { ...apt, status: status as any } : apt
        ),
        currentAppointment:
          state.currentAppointment?._id === appointmentId
            ? { ...state.currentAppointment, status: status as any }
            : state.currentAppointment,
      }));

      return response.data;
    } catch (error: any) {
      set({ error: error?.message || "Failed to update status" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
