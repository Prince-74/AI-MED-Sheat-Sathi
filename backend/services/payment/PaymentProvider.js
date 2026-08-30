/**
 * Abstract Payment Provider Base Class
 * Defines the contract that every payment provider (Mock, Razorpay, etc.) must fulfill.
 */
export class PaymentProvider {
  constructor(name) {
    if (new.target === PaymentProvider) {
      throw new TypeError("Cannot instantiate abstract class PaymentProvider directly.");
    }
    this.name = name;
  }

  /**
   * Creates a payment order on the provider.
   * @param {Object} params - { amount, currency, receiptId, appointmentId, metadata }
   * @returns {Promise<{ providerOrderId: string, amount: number, currency: string, raw: Object }>}
   */
  async createOrder(params) {
    throw new Error("Method createOrder() must be implemented.");
  }

  /**
   * Verifies the authenticity / completion of a payment.
   * @param {Object} params - { providerOrderId, providerPaymentId, signature, result, metadata }
   * @returns {Promise<{ verified: boolean, providerPaymentId: string, status: string, error?: string }>}
   */
  async verifyPayment(params) {
    throw new Error("Method verifyPayment() must be implemented.");
  }

  /**
   * Queries status of an order from the provider.
   * @param {string} providerOrderId
   */
  async getPaymentStatus(providerOrderId) {
    throw new Error("Method getPaymentStatus() must be implemented.");
  }
}
