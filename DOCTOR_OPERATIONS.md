# Doctor Operations Architecture (Phase 6)

This document specifies the operational capabilities and endpoints available to medical professionals on the AI-MED platform.

---

## 1. Operational Flow

```
Doctor Login
    ¦
    ?
Doctor Dashboard (/doctor/dashboard)
    +-- Real Stats (Total Patients, Today Visits, Pending Requests, Real Revenue)
    +-- Pending Requests Queue (1-Click Accept / Reject)
    +-- Today Schedule (1-Click Start Consultation)
    +-- Upcoming Schedule
```

---

## 2. Doctor Appointment Lifecycle & Actions

| State | Action Available | Destination / API | Resulting State |
|---|---|---|---|
| `PENDING` | **Accept** | `PUT /api/appointment/:id/accept` | `CONFIRMED` |
| `PENDING` | **Reject** | `PUT /api/appointment/:id/reject` | `REJECTED` |
| `CONFIRMED` / `UPCOMING` | **Start Consultation** | `/call/:appointmentId` | `IN_PROGRESS` |
| `CONFIRMED` | **Cancel** | `PUT /api/appointment/:id/cancel` | `CANCELLED` |
| `IN_PROGRESS` | **Complete & Prescribe** | `POST /api/telehealth/:appointmentId/end` | `COMPLETED` |

---

## 3. Endpoints & Authorization

- `GET /api/doctor/dashboard` — Returns real calculated metrics (`pendingCount`, `todayAppointments`, `completedAppointments`, `totalRevenue`) and appointment lists. Requires `doctor` role.
- `GET /api/appointment/doctor` — Returns filtered doctor appointment queue (`ALL`, `PENDING`, `UPCOMING`, `COMPLETED`, `CANCELLED`).
- `GET /api/appointment/:id` — Detailed view of appointment, patient profile, schedule, and symptoms. Strict participant check.
- `PUT /api/doctor/onboarding/update` — Whitelisted update of specialization, fees, daily time ranges, hospital info, and slot duration. Protected security fields (`role`, `isAdmin`, `verificationStatus`) are discarded.
