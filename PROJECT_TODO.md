# PROJECT_TODO - AI-MED Roadmap

This document outlines all identified issues and missing features organized by phase. Each phase builds on the previous one and should be completed in order.

---

## PHASE 1 — APPLICATION STABILIZATION ✅ COMPLETE

### Completed Items
- ✅ Fixed missing `toast` import in BookAppointmentPayment.tsx
- ✅ Created DoctorAppointments.tsx page and registered `/doctor/appointments` route
- ✅ Fixed broken route references (`/doctor/profile` → `/profile`)
- ✅ Disabled broken `/cart` navigation in Pharmacy
- ✅ Added TypeScript deprecation fix in tsconfig.app.json
- ✅ Created ErrorBoundary component and wrapped app
- ✅ Created .env.example files

### Verified as Working
- ✅ Auth store persists and restores token on page refresh
- ✅ Protected routes properly check authentication and roles
- ✅ Loading states exist on major pages (Bookings, DoctorDashboard, BookAppointment)
- ✅ Doctor dashboard and patient home pages functional
- ✅ Appointment booking flow (3-step wizard) functional
- ✅ HTTP service properly uses authentication headers

---

## PHASE 2 — AUTHENTICATION & SECURITY 🔐 CRITICAL

### Critical Security Issues
1. **Hardcoded Secrets in Frontend**
   - Location: `VideoCall.tsx` line ~44
   - Issue: `VITE_ZEGO_SERVER_SECRET` exposed in frontend code
   - Impact: Security vulnerability
   - Solution: Move Zego token generation to backend endpoint
   - Affected Files: frontend/src/pages/VideoCall.tsx

2. **Secrets in .env Files**
   - Location: `frontend/.env` and `backend/.env`
   - Issue: Real secrets committed to repository
   - Impact: High security risk if repo is public
   - Solution: 
     - Remove .env from git (already should be in .gitignore)
     - Use environment variable management for production
     - Ensure .env files are never committed

3. **JWT Token Management**
   - Current: Token stored in localStorage, no refresh mechanism
   - Required: Implement refresh token rotation
   - Location: frontend/src/store/authStore.ts, backend/routes/auth.js
   - Recommendation: Add httpOnly cookie support for token storage

4. **Google OAuth Flow**
   - Current: OAuth flow exists but needs verification
   - Required: Test complete OAuth flow (sign-in and sign-up)
   - Location: backend/config/passport.js, frontend/pages/auth/SignIn.tsx
   - Issue: Callback handling needs verification

### Tasks
- [ ] Move Zego token generation to backend API endpoint
- [ ] Implement refresh token architecture
- [ ] Add httpOnly cookie support for auth tokens
- [ ] Implement token revocation endpoint
- [ ] Test complete OAuth sign-in and sign-up flow
- [ ] Add rate limiting to auth endpoints
- [ ] Implement account lockout after failed login attempts
- [ ] Add email verification for new accounts
- [ ] Document authentication flow

---

## PHASE 3 — APPOINTMENT ENGINE 📅

### Features to Implement
1. **Advanced Slot Management**
   - Current: Basic slot generation from doctor availability
   - Required: 
     - Conflict detection for booked slots
     - Dynamic slot availability updates
     - Cancellation slot recovery
   - Files: appointmentStore.ts, backend appointment routes

2. **Appointment Lifecycle**
   - Current: Scheduling works, completion flow needs work
   - Required:
     - Appointment reminders/notifications
     - Cancellation with refund logic
     - Rescheduling capability
     - Appointment status transitions

3. **Doctor Availability Management**
   - Current: Basic time ranges and excluded weekdays
   - Required:
     - Doctor can update availability in real-time
     - Support for multiple time zones
     - Support for doctor leaves/vacation periods

### Tasks
- [ ] Implement booked slot filtering in slot selection
- [ ] Add appointment cancellation with refund logic
- [ ] Implement appointment rescheduling
- [ ] Add appointment notifications/reminders
- [ ] Create doctor availability management UI

---

## PHASE 4 — PAYMENT & CONFIRMATION ✅ PAYMENT

### Current Status
- Basic payment page exists (BookAppointmentPayment.tsx)
- No actual payment gateway integrated yet

### Required Tasks
- [ ] Integrate payment gateway (Razorpay, Stripe, or similar)
- [ ] Implement payment verification
- [ ] Add payment success/failure handling
- [ ] Implement refund mechanism
- [ ] Add payment receipts/invoices
- [ ] Implement payout system for doctors
- [ ] Track and report transaction status

---

## PHASE 5 — TELEHEALTH 🎥

### Current Status
- Zego UI Kit integrated in VideoCall.tsx
- Server secret hardcoded (SECURITY ISSUE - see Phase 2)
- Basic video call UI exists

### Required Tasks
- [ ] Fix Zego token generation (move to backend)
- [ ] Test end-to-end video consultation
- [ ] Implement call recording (if needed)
- [ ] Add screen sharing functionality
- [ ] Implement chat during consultation
- [ ] Add call quality monitoring
- [ ] Test on various network conditions

---

## PHASE 6 — DOCTOR WORKFLOW 🏥

### Features Needed
1. **Doctor Dashboard**
   - Current: Basic stats and appointment list
   - Required: 
     - Upcoming appointments widget
     - Quick actions (join call, start consultation)
     - Revenue tracking
     - Patient queue management

2. **Prescription Management**
   - Current: Modal exists in DoctorDashboard
   - Required:
     - Prescription history
     - Prescription templates
     - E-prescription generation
     - Integration with pharmacy

3. **Medical Records Access**
   - Current: Patient medical history page exists
   - Required:
     - Real-time access to patient records during consultation
     - Note-taking during consultation
     - Digital signature for notes/prescriptions

### Tasks
- [ ] Enhance doctor dashboard with better analytics
- [ ] Create prescription template system
- [ ] Implement digital signatures for prescriptions
- [ ] Add patient note-taking during consultation
- [ ] Create doctor performance metrics

---

## PHASE 7 — PATIENT WORKFLOW 👤

### Features Needed
1. **Patient Dashboard**
   - Current: Home page with quick actions exists
   - Required:
     - Appointment history
     - Health summary
     - Upcoming reminder
     - Quick booking suggestions

2. **Medical Records Management**
   - Current: Health records page exists but minimal
   - Required:
     - Document uploads
     - Medical history timeline
     - Family health history
     - Allergies and medications tracking

3. **Patient Notifications**
   - Current: No notification system
   - Required:
     - Appointment reminders
     - Doctor response notifications
     - Prescription ready notifications

### Tasks
- [ ] Enhance patient dashboard with health summary
- [ ] Implement medical records timeline view
- [ ] Add family health history management
- [ ] Create allergy and medication tracking
- [ ] Implement notification preferences

---

## PHASE 8 — MEDICAL RECORDS & PRESCRIPTIONS 📋

### Current Status
- ReportAnalyzer page exists (AI analysis)
- HealthRecords page exists
- Prescription modal exists but not fully integrated
- OCR functionality for document analysis

### Required Tasks
- [ ] Implement document storage and retrieval
- [ ] Create medical record templates
- [ ] Add report analysis with AI insights
- [ ] Implement prescription validation
- [ ] Create medication reminder system
- [ ] Add lab report integration
- [ ] Implement medical history search
- [ ] Create patient health dashboard

---

## PHASE 9 — NOTIFICATIONS 🔔

### Current Status
- No notification system implemented
- Sonner toast notifications for UI feedback only

### Required Tasks
- [ ] Implement email notifications
- [ ] Implement SMS notifications
- [ ] Implement push notifications
- [ ] Create notification preference center
- [ ] Add notification history/archive
- [ ] Implement notification scheduling
- [ ] Add multi-channel notification strategy

---

## PHASE 10 — TESTING & PRODUCTION HARDENING 🧪

### Required Tasks
- [ ] Unit tests for utility functions
- [ ] Integration tests for API endpoints
- [ ] End-to-end tests for critical flows
- [ ] Performance testing and optimization
- [ ] Load testing for concurrent users
- [ ] Security testing (OWASP Top 10)
- [ ] Database backup and recovery testing
- [ ] Logging and monitoring setup
- [ ] Error tracking (Sentry or similar)
- [ ] Analytics implementation

---

## PHASE 11 — UI/UX REFINEMENT 🎨

### Current Status
- UI built with Radix UI components and Tailwind CSS
- Responsive design implemented
- Dark mode support exists in design system

### Required Tasks
- [ ] User testing and feedback incorporation
- [ ] Accessibility (WCAG 2.1) audit
- [ ] Responsive design testing on all devices
- [ ] Dark mode full implementation
- [ ] Animation and transition polish
- [ ] Empty state illustrations
- [ ] Error state improvements
- [ ] Loading skeleton screens
- [ ] Onboarding flow refinement

---

## PHASE 12 — ADMIN PANEL 👨‍💼

### Required Features
- [ ] User management (approve doctors, block users)
- [ ] Financial reports and dashboards
- [ ] System health monitoring
- [ ] Manual appointment management
- [ ] Dispute resolution interface
- [ ] Audit logging
- [ ] System configuration panel

---

## OPEN QUESTIONS & CLARIFICATIONS

1. **Payment Gateway**: Which payment provider? Razorpay, Stripe, or custom?
2. **Video Call Provider**: Zego or alternatives? (Current: Zego)
3. **Database Strategy**: MongoDB is being used. Need data retention policy.
4. **Scalability**: Expected concurrent users? Affects infrastructure planning.
5. **AI Services**: Gemini API used for OCR and symptom checking. Backup services needed?
6. **Email Service**: Gmail configured. Gmail limitations apply. Consider AWS SES or SendGrid for production.

---

## DEPENDENCY UPDATES NEEDED

### Frontend
- Review and update React dependencies
- Update Tailwind CSS to latest
- Update TypeScript to latest stable version

### Backend
- Update Express.js
- Update Mongoose to latest
- Review security patches for all dependencies

---

## PERFORMANCE OPTIMIZATION ROADMAP

1. **Frontend Optimization**
   - Implement code splitting
   - Lazy load routes
   - Image optimization
   - Bundle size analysis and reduction

2. **Backend Optimization**
   - Database indexing review
   - Query optimization
   - Caching strategy (Redis)
   - API response caching

3. **Infrastructure**
   - CDN implementation
   - Server response compression
   - Database clustering
   - Load balancing

---

## MONITORING & LOGGING

### Current Status
- Console logging exists
- No centralized monitoring

### Required
- [ ] Implement structured logging
- [ ] Central log aggregation
- [ ] Error tracking service
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] API monitoring/rate limiting
- [ ] Database query monitoring

---

## DOCUMENTATION

### Current Status
- README.md and REVAMP_CHANGELOG.md exist
- .env.example files created

### Required
- [ ] API endpoint documentation (OpenAPI/Swagger)
- [ ] Database schema documentation
- [ ] Architecture documentation
- [ ] Deployment guide
- [ ] Developer setup guide
- [ ] Code style guide
- [ ] Contributing guidelines

---

## KNOWN LIMITATIONS & WORKAROUNDS

1. **Zego Video Calling**: Server secret currently in frontend code (PHASE 2)
2. **Email Service**: Limited by Gmail API rate limits
3. **File Uploads**: No file size limit validation currently
4. **Session Management**: No session timeout currently implemented
5. **Offline Support**: App is online-only, no offline mode

---

## TECH DEBT

1. Reduce use of `any` type in TypeScript
2. Consolidate error handling patterns
3. Create reusable API hooks for stores
4. Extract magic numbers to constants
5. Add comprehensive error logging
6. Create loading state utility hooks

---

## END OF DOCUMENT

Last Updated: 2026-08-31
Maintained By: Development Team
Status: Phase 1 Complete - Ready for Phase 2
