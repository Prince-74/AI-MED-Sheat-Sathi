# Telehealth & Real-Time Consultation Architecture (Phase 5)

This document specifies the secure, appointment-controlled telehealth consultation system supporting video and audio-only sessions with server-side Zego token generation, participant presence, waiting room, and live status synchronization.

---

## 1. Architectural Overview & Security Boundary

```
                     Patient / Doctor Browser
                               ¦
                               ¦ Authenticated Request (Bearer JWT)
                               ?
                   Telehealth API Router (Backend)
               (POST /api/telehealth/:appointmentId/join)
                               ¦
                               +- 1. Authenticate JWT Session
                               +- 2. Verify Appointment Record
                               +- 3. Enforce Strict Participant Check (Patient/Doctor)
                               +- 4. Verify Appointment State (CONFIRMED/IN_PROGRESS)
                               +- 5. Transition State to IN_PROGRESS
                               ?
                   ZegoService (Server-Only Crypto)
                 (Generates Temporary Token04)
                               ¦
                               ?
              Returns Temporary Token04 & Room ID
                  (Zero Server Secret Leakage)
                               ¦
                               ?
                    ZegoUIKit in Browser
                  (ZegoUIKitPrebuilt.create)
                               ¦
                               ?
                     Encrypted WebRTC Room
```

---

## 2. Token Generation & Security Model

1. **Zero Frontend Secret Exposure**:
   - `ZEGO_SERVER_SECRET` resides strictly on the backend (`backend/.env`).
   - The frontend never receives, stores, or accesses private server keys.
2. **Server-Side Token04 Generator (`backend/services/telehealth/zegoService.js`)**:
   - Uses AES-256-CBC encryption with binary packed buffers (creation time, 1-hour expiration timestamp, 16-byte random IV, and user/room permissions payload).
   - Generates format starting with `"04..."`.
3. **Strict Participant Isolation**:
   - If User B attempts to call `/api/telehealth/:appointmentId/join` for User A's appointment, the backend rejects with `403 Forbidden` (`UNAUTHORIZED_CONSULTATION_ACCESS`).
4. **State Machine Invariant**:
   - `CANCELLED`, `REJECTED`, or `COMPLETED` appointments are permanently blocked from room entry.

---

## 3. Consultation Modes (VIDEO vs AUDIO)

The consultation UI dynamically adapts to the appointment's `consultationType`:

| Feature | `VIDEO` ("Video Consultation") | `AUDIO` ("Voice Call") |
|---|---|---|
| Camera | Enabled by default | Disabled & camera controls hidden |
| Microphone | Enabled | Enabled |
| UI Banner | HD Video Consultation | Audio-Only Consultation |
| Screen Sharing | Supported | Disabled |
| Media Stream | Audio + Video | Audio only (low bandwidth) |

---

## 4. Real-Time Room Events & State Machine

```
   CONFIRMED / UPCOMING
         ¦
         ¦ Patient / Doctor Joins Room
         ?
     IN_PROGRESS (startedAt timestamp set)
         ¦
         +-- participant_presence (Socket.IO broadcast: CONNECTED / DISCONNECTED)
         +-- Call Timer (derived from startedAt to prevent clock drift)
         ¦
         ¦ Doctor Ends Session (POST /api/telehealth/:appointmentId/end)
         ?
     COMPLETED (completedAt timestamp set, prescription & notes saved)
```

### Handled Socket.IO Room Events:
- `consultation_joined`: Participant enters room.
- `participant_presence`: Broadcasts CONNECTED / DISCONNECTED status for waiting room indicator.
- `consultation_ended`: Broadcasts completion to automatically conclude session and prompt prescription modal.

---

## 5. API Endpoints

- `POST /api/telehealth/:appointmentId/join` — Authorizes participant and returns temporary Zego token.
- `POST /api/telehealth/:appointmentId/end` — Concludes consultation, updates status to `COMPLETED`, records `completedAt`, prescription, and notes.
- `GET /api/telehealth/:appointmentId/status` — Returns live consultation state and presence.
