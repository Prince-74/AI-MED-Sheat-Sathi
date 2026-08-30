# Patient Operations Architecture (Phase 7)

This document specifies the patient dashboard, booking management, and consultation workflow.

---

## 1. Operational Flow

```
Patient Login
    ¦
    ?
Patient Home (/dashboard)
    +-- Next Scheduled Consultation Card (Live badge, Doctor info, Join Call)
    +-- Quick Health Actions (Symptom Checker, Reports, Medicine, Telehealth)
    +-- Available Specialists List
```

---

## 2. Patient Booking Lifecycle & Actions

| State | Action Available | Destination / API | Resulting State |
|---|---|---|---|
| `PENDING` / `CONFIRMED` | **Cancel** | `PUT /api/appointment/:id/cancel` | `CANCELLED` |
| `CONFIRMED` / `IN_PROGRESS` | **Join Consultation** | `/call/:appointmentId` | `IN_PROGRESS` |
| `ANY` | **View Details** | `/appointments/:id` | Detailed View |
| `COMPLETED` | **View Prescription** | `/appointments/:id` | Prescribed Medication & Advice |

---

## 3. Endpoints & Authorization

- `GET /api/patient/dashboard` — Returns closest `nextAppointment`, `upcomingAppointments`, `recentCompleted`, and counts. Requires `patient` role.
- `GET /api/appointment/patient` — List of patient appointments with status filtering.
- `GET /api/appointment/:id` — Detailed view for booking patient. Other patients receive `403 Forbidden`.
- `PUT /api/patient/onboarding/update` — Whitelisted profile updates (name, phone, dob, blood group, emergency contact).
