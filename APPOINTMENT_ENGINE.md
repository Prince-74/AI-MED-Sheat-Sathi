# Appointment Engine Architecture (Phase 3)

The **AI-MED Appointment Engine** is a reliable, backend-driven scheduling, slot availability, and state machine system. It serves as the single source of truth for doctor working hours, prevents race-condition double bookings, and enforces strict role-based access control.

---

## 1. Domain Model

```
Appointment
+-- _id: ObjectId (Unique)
+-- doctorId: ObjectId (ref: Doctor)
+-- patientId: ObjectId (ref: Patient)
+-- date: Date
+-- dateString: String (YYYY-MM-DD canonical)
+-- slotStartIso: String (ISO 8601 Timestamp)
+-- slotEndIso: String (ISO 8601 Timestamp)
+-- consultationType: "Video Consultation" | "Voice Call" | "VIDEO" | "AUDIO"
+-- status: "PENDING" | "CONFIRMED" | "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "REJECTED"
+-- symptoms: String
+-- zegoRoomId: String
+-- prescription: String
+-- notes: String
+-- confirmedAt: Date
+-- startedAt: Date
+-- completedAt: Date
+-- cancelledBy: "patient" | "doctor" | "system"
+-- cancelReason: String
+-- cancelledAt: Date
+-- rejectedBy: ObjectId
+-- rejectReason: String
+-- rejectedAt: Date
+-- consultationFees: Number
+-- platformFees: Number
+-- totalAmount: Number
```

---

## 2. Appointment Lifecycle & State Machine

```
   PENDING (Initial booking if confirmation required)
      +-- ACCEPT  ? CONFIRMED
      +-- REJECT  ? REJECTED (Terminal)
      +-- CANCEL  ? CANCELLED (Terminal)

   CONFIRMED (Direct booked or accepted)
      +-- JOIN    ? IN_PROGRESS
      +-- CANCEL  ? CANCELLED (Terminal)

   UPCOMING
      +-- JOIN    ? IN_PROGRESS
      +-- CANCEL  ? CANCELLED (Terminal)

   IN_PROGRESS
      +-- END     ? COMPLETED (Terminal)
```

### Transition Policy Matrix
| Current State | Permitted Next States | Authorized Roles |
|---|---|---|
| `PENDING` | `CONFIRMED`, `REJECTED`, `CANCELLED` | Doctor (Confirm/Reject), Patient/Doctor (Cancel) |
| `CONFIRMED` | `UPCOMING`, `IN_PROGRESS`, `CANCELLED` | Doctor (Start), Patient/Doctor (Cancel) |
| `UPCOMING` | `IN_PROGRESS`, `CANCELLED` | Doctor/Patient (Start), Patient/Doctor (Cancel) |
| `IN_PROGRESS` | `COMPLETED` | Doctor / Patient (End call) |
| `COMPLETED` | *Terminal (No transitions allowed)* | - |
| `CANCELLED` | *Terminal (No transitions allowed)* | - |
| `REJECTED` | *Terminal (No transitions allowed)* | - |

---

## 3. Authoritative Backend Slot Availability

The frontend does **NOT** generate slots in memory. It requests authoritative availability from:

```http
GET /api/appointment/availability/:doctorId?date=YYYY-MM-DD
```

### Slot Calculation Logic:
$$\text{Doctor Daily Time Ranges} + \text{Slot Duration} - \text{Excluded Weekdays} - \text{Past Slots} - \text{Active Bookings} = \text{Available Slots}$$

### Sample Response:
```json
{
  "success": true,
  "data": {
    "date": "2026-09-14",
    "doctorId": "65b...",
    "doctorName": "Dr. Sarah Jenkins",
    "slotDuration": 30,
    "totalSlots": 6,
    "availableSlots": 5,
    "slots": [
      {
        "startTime": "10:00",
        "endTime": "10:30",
        "slotStartIso": "2026-09-14T10:00:00.000Z",
        "slotEndIso": "2026-09-14T10:30:00.000Z",
        "available": false,
        "isBooked": true,
        "isPast": false
      },
      {
        "startTime": "10:30",
        "endTime": "11:00",
        "slotStartIso": "2026-09-14T10:30:00.000Z",
        "slotEndIso": "2026-09-14T11:00:00.000Z",
        "available": true,
        "isBooked": false,
        "isPast": false
      }
    ]
  }
}
```

---

## 4. Double-Booking Prevention & Concurrency Protection

1. **MongoDB Partial Unique Compound Index**:
   ```javascript
   appointmentSchema.index(
     { doctorId: 1, slotStartIso: 1 },
     {
       unique: true,
       partialFilterExpression: {
         status: { $in: ["PENDING", "CONFIRMED", "UPCOMING", "IN_PROGRESS", "Scheduled"] }
       }
     }
   );
   ```
2. **Race-Condition Behavior**:
   - If Patient A and Patient B submit concurrent bookings for the exact same slot:
     - **Patient A**: 201 Created (Appointment confirmed).
     - **Patient B**: `409 Conflict` (`SLOT_ALREADY_BOOKED`).
   - The frontend intercepts 409 responses, alerts the user with a clean notification, and automatically reloads available slots.
3. **Slot Recycling on Cancellation**:
   - Because `CANCELLED` and `REJECTED` statuses are excluded from the partial unique filter, cancelling an appointment automatically reopens that time slot for new bookings.

---

## 5. Standardized Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `SLOT_ALREADY_BOOKED` | 409 | Time slot has already been reserved by another patient. |
| `PAST_DATE` | 400 | Attempted to book a time slot in the past. |
| `INVALID_DATE` | 400 | Malformed date string (expected YYYY-MM-DD). |
| `INVALID_TIME` | 400 | Malformed timestamp or invalid duration boundaries. |
| `DOCTOR_NOT_FOUND` | 404 | Doctor does not exist or is inactive. |
| `APPOINTMENT_NOT_FOUND` | 404 | Requested appointment record not found. |
| `UNAUTHORIZED_APPOINTMENT_ACCESS` | 403 | User is not the assigned doctor or patient. |
| `INVALID_STATUS_TRANSITION` | 400 | Target state transition violates lifecycle rules. |

---

## 6. API Endpoints

- `GET /api/appointment/availability/:doctorId?date=YYYY-MM-DD` — Authoritative slot availability.
- `POST /api/appointment/book` — Concurrency-safe appointment booking (patient only).
- `GET /api/appointment/doctor` — List appointments for authenticated doctor.
- `GET /api/appointment/patient` — List appointments for authenticated patient.
- `GET /api/appointment/:id` — Get single appointment (participant isolation).
- `PUT /api/appointment/:id/accept` — Doctor accepts appointment (`PENDING` ? `CONFIRMED`).
- `PUT /api/appointment/:id/reject` — Doctor rejects appointment (`PENDING` ? `REJECTED`).
- `PUT /api/appointment/:id/cancel` — Patient or doctor cancels appointment (`CONFIRMED`/`PENDING` ? `CANCELLED`).
- `PUT /api/appointment/status/:id` — Controlled status transition.
- `GET /api/appointment/join/:id` — Participant joins consultation (`CONFIRMED` ? `IN_PROGRESS`).
- `PUT /api/appointment/end/:id` — End consultation (`IN_PROGRESS` ? `COMPLETED`).
