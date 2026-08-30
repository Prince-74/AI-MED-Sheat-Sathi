# Payment & Booking Confirmation Architecture (Phase 4)

This document specifies the payment and appointment confirmation system in AI-MED. The architecture isolates payment providers behind a uniform `PaymentProvider` interface and coordinates state transitions through a centralized `PaymentService`.

---

## 1. Architectural Overview

```
                          Frontend UI
                     (BookAppointmentPayment)
                                ¦
                                ?
                       Payment API Router
                     (POST /payment/verify)
                                ¦
                                ?
                         PaymentService
                      (Idempotent Handler)
                                ¦
                                ?
                         PaymentProvider
                          (Abstraction)
                         /             \
                        /               \
                       ?                 ?
             MockPaymentProvider    RazorpayProvider
                  (ACTIVE)              (FUTURE)
```

---

## 2. Core Payment Lifecycle

```
    CREATED (Payment order initiated)
       ¦
       ?
    PENDING (Waiting for user action on gateway)
     +-- SUCCESS ? PAID (Appointment transitioned to CONFIRMED)
     +-- FAILURE ? FAILED (Appointment remains unconfirmed)
     +-- CANCEL  ? CANCELLED (Appointment remains unconfirmed)
```

---

## 3. Relationship Between Payment & Appointment State

| Trigger | Payment Status | Appointment Status | Notes |
|---|---|---|---|
| Initial Slot Booking | `CREATED` / `PENDING` | `PENDING` | Slot is held, awaiting payment |
| Verified Payment Success | `PAID` | `CONFIRMED` | Digital receipt generated, socket broadcast |
| Payment Declined / Error | `FAILED` | `PENDING` | User alerted, can retry or pick new slot |
| User Cancels Payment | `CANCELLED` | `PENDING` | Payment order marked cancelled |

---

## 4. Backend Price Authority & Security

1. **Zero Client Trust on Amounts**:
   - The payable amount is strictly derived on the backend:
     $$\text{Total Amount} = \text{Doctor Consultation Fee} + \text{Platform Fee}$$
   - Any client-submitted amount in request bodies is discarded.
2. **Participant Authorization & Tenant Isolation**:
   - All payment endpoints (`/payment/create-order`, `/payment/verify`, `/payment/:id/receipt`) verify `payment.patientId === req.auth.id`.
3. **Idempotent Verification**:
   - Multiple sequential verify calls for the same order return the existing `PAID` confirmation and receipt without writing duplicate records or charging twice.

---

## 5. Digital Receipt Model

Every verified payment generates a digital receipt record:

```json
{
  "receiptId": "RCP-M7K3J9-A4B2",
  "orderId": "MOCK_ORD_1788040000000_XY12AB",
  "providerPaymentId": "MOCK_PAY_1788040000000_9876",
  "amount": 750,
  "currency": "INR",
  "status": "PAID",
  "paidAt": "2026-08-31T03:50:00.000Z",
  "provider": "MOCK",
  "patient": {
    "id": "65a...",
    "name": "Emma Watson"
  },
  "doctor": {
    "id": "65b...",
    "name": "Dr. Marcus Vance",
    "specialization": "Neurologist"
  },
  "appointment": {
    "id": "65c...",
    "date": "2026-09-20",
    "slotStartIso": "2026-09-20T09:00:00.000Z",
    "consultationType": "Video Consultation",
    "status": "CONFIRMED"
  }
}
```

---

## 6. Future Razorpay Migration Guide

To replace the `MockPaymentProvider` with **Razorpay**:

1. Create `backend/services/payment/RazorpayPaymentProvider.js` extending `PaymentProvider`:
   ```javascript
   import Razorpay from "razorpay";
   import { PaymentProvider } from "./PaymentProvider.js";

   export class RazorpayPaymentProvider extends PaymentProvider {
     constructor() {
       super("RAZORPAY");
       this.instance = new Razorpay({
         key_id: process.env.RAZORPAY_KEY_ID,
         key_secret: process.env.RAZORPAY_KEY_SECRET,
       });
     }

     async createOrder({ amount, currency = "INR", receiptId }) {
       const order = await this.instance.orders.create({
         amount: Math.round(amount * 100), // In paise
         currency,
         receipt: receiptId,
       });
       return { providerOrderId: order.id, amount, currency, provider: this.name };
     }

     async verifyPayment({ providerOrderId, providerPaymentId, signature }) {
       const isValid = verifyRazorpaySignature(providerOrderId, providerPaymentId, signature, process.env.RAZORPAY_KEY_SECRET);
       return { verified: isValid, status: isValid ? "PAID" : "FAILED", providerPaymentId };
     }
   }
   ```
2. In `backend/services/payment/PaymentService.js`, initialize with `new RazorpayPaymentProvider()`.
3. **No changes required** to `appointmentEngine.js`, routes, confirmation screens, receipts, or database models.
