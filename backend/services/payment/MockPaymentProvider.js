import { PaymentProvider } from "./PaymentProvider.js";

/**
 * MockPaymentProvider
 * Simulates a realistic payment gateway with deterministic success/failure/cancellation paths.
 */
export class MockPaymentProvider extends PaymentProvider {
  constructor() {
    super("MOCK");
  }

  async createOrder({ amount, currency = "INR", receiptId, appointmentId, metadata = {} }) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const providerOrderId = `MOCK_ORD_${timestamp}_${randomSuffix}`;

    return {
      providerOrderId,
      amount,
      currency: currency.toUpperCase(),
      provider: this.name,
      createdAt: new Date().toISOString(),
      raw: {
        receipt: receiptId,
        appointmentId,
        metadata,
      },
    };
  }

  async verifyPayment({ providerOrderId, providerPaymentId, result = "SUCCESS", metadata = {} }) {
    const normalizedResult = String(result).toUpperCase();

    if (normalizedResult === "SUCCESS") {
      const generatedPaymentId =
        providerPaymentId || `MOCK_PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      return {
        verified: true,
        status: "PAID",
        providerPaymentId: generatedPaymentId,
        paidAt: new Date(),
      };
    }

    if (normalizedResult === "CANCEL" || normalizedResult === "CANCELLED") {
      return {
        verified: false,
        status: "CANCELLED",
        error: "Payment cancelled by patient",
      };
    }

    // Default to FAILURE
    return {
      verified: false,
      status: "FAILED",
      error: metadata.failureReason || "Simulated payment failure (insufficient funds or bank rejection)",
    };
  }

  async getPaymentStatus(providerOrderId) {
    return {
      providerOrderId,
      provider: this.name,
      status: "PENDING",
    };
  }
}
