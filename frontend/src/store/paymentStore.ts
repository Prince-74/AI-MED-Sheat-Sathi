import { getWithAuth, postWithAuth } from "@/service/httpService";
import { create } from "zustand";

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  provider: string;
  appointmentId: string;
  doctor?: {
    name: string;
    specialization: string;
    fees: number;
  };
  slot?: {
    slotStartIso: string;
    slotEndIso: string;
    consultationType: string;
  };
}

export interface Receipt {
  receiptId: string;
  paymentId: string;
  orderId: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string;
  provider: string;
  patient: {
    id: string;
    name: string;
    email?: string;
  };
  doctor: {
    id: string;
    name: string;
    specialization?: string;
    hospital?: string;
  };
  appointment: {
    id: string;
    date: string;
    slotStartIso: string;
    slotEndIso: string;
    consultationType: string;
    status: string;
  };
}

interface PaymentState {
  currentOrder: PaymentOrder | null;
  receipt: Receipt | null;
  loading: boolean;
  error: string | null;

  clearError: () => void;
  createPaymentOrder: (appointmentId: string) => Promise<PaymentOrder>;
  verifyPayment: (params: {
    orderId: string;
    result?: "SUCCESS" | "FAILURE" | "CANCEL" | "CANCELLED";
    providerPaymentId?: string;
    metadata?: Record<string, any>;
  }) => Promise<{ success: boolean; appointment: any; receipt?: Receipt; message?: string }>;
  fetchReceipt: (paymentId: string) => Promise<Receipt | null>;
  fetchPaymentByAppointment: (appointmentId: string) => Promise<any>;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  currentOrder: null,
  receipt: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  createPaymentOrder: async (appointmentId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await postWithAuth<PaymentOrder>("/payment/create-order", {
        appointmentId,
      });
      const order = response.data;
      set({ currentOrder: order });
      return order;
    } catch (error: any) {
      const msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create payment order";
      set({ error: msg });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  verifyPayment: async ({ orderId, result = "SUCCESS", providerPaymentId, metadata }) => {
    set({ loading: true, error: null });
    try {
      const response = await postWithAuth<any>("/payment/verify", {
        orderId,
        result,
        providerPaymentId,
        metadata,
      });

      const data = response.data;
      if (data?.receipt) {
        set({ receipt: data.receipt });
      }

      return data;
    } catch (error: any) {
      const msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Payment verification failed";
      set({ error: msg });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchReceipt: async (paymentId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await getWithAuth<Receipt>(`/payment/${paymentId}/receipt`);
      set({ receipt: response.data });
      return response.data;
    } catch (error: any) {
      set({ error: error?.message || "Failed to fetch receipt" });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchPaymentByAppointment: async (appointmentId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await getWithAuth<any>(`/payment/appointment/${appointmentId}`);
      return response.data;
    } catch (error: any) {
      set({ error: error?.message || "Failed to fetch payment details" });
      return null;
    } finally {
      set({ loading: false });
    }
  },
}));
