# Somvanshi CRM - Product Requirements Document

## Original Problem Statement
Build a web-based CRM called "Somvanshi CRM" for business development team at Somvanshi Technologies.
Team: Ameya Somvanshi (CEO/Admin), Rajdeep Ghai, Ishaan Nair, Bhargavi Mutyarapwar (Sales)

## User Choices
- JWT-based custom authentication (email/password)
- Pre-created accounts for 4 team members (password: SomvanshiTechnologies@101025)
- In-app notifications only
- Professional SaaS-style interface
- CSV/Excel export for reports

## User Personas
1. **CEO (Admin)**: Ameya Somvanshi - Full access, monitors team performance, reviews pipeline
2. **Sales Team**: Rajdeep, Ishaan, Bhargavi - Manage their leads, log activities, schedule meetings

## Core Requirements
- Lead Management with 11-stage pipeline (Lead Identified → Closed Won/Lost)
- Activity Tracking (Calls, Emails, WhatsApp, Meetings, Notes, Follow-ups)
- Meeting Scheduling and Tracking
- Revenue Tracking (Estimated & Final deal values)
- CEO Dashboard with KPIs and team performance
- Reports (Daily/Weekly/Monthly) with CSV export
- In-app Notifications
- Role-based access control

## What's Been Implemented (March 2024)

### Backend (FastAPI + MongoDB)
- ✅ JWT Authentication with bcrypt password hashing
- ✅ User management with roles (admin/sales)
- ✅ Lead CRUD with 11-stage pipeline
- ✅ Activity tracking system
- ✅ Meeting management
- ✅ Notification system
- ✅ Dashboard stats API
- ✅ Team performance metrics API
- ✅ Reports API (leads, revenue, export)
- ✅ Pre-seeded 4 users

### Frontend (React + Tailwind + Shadcn)
- ✅ Login page with team member directory
- ✅ Dashboard with KPI cards and charts
- ✅ Leads list with search, filter, add/edit
- ✅ Pipeline Kanban board with drag-drop
- ✅ Activities page with timeline view
- ✅ Meetings page with scheduling
- ✅ Reports page with Daily/Weekly/Monthly tabs
- ✅ Team Performance page (admin only)
- ✅ Notification panel
- ✅ CSV export functionality
- ✅ Responsive design
- ✅ Role-based navigation

## Prioritized Backlog

### P0 (Critical) - DONE
- All core features implemented

### P1 (High Priority) - Future
- Follow-up reminders with email/push notifications
- Calendar integration (Google Calendar)
- Lead import from CSV
- Advanced filtering and sorting

### P2 (Medium Priority) - Future
- Email integration (send emails from CRM)
- LinkedIn integration
- Apollo integration
- AI lead scoring
- Custom fields for leads

### P3 (Nice to Have) - Future
- Mobile app
- Automated email outreach
- Advanced analytics
- Custom reports builder
- Multi-team support

## Technical Architecture
- Backend: FastAPI, MongoDB, JWT Auth
- Frontend: React 19, Tailwind CSS, Shadcn/UI
- Database: MongoDB with Motor async driver
- Charts: Recharts
- State: React Context API

## Next Tasks
1. Add email notification integration (SendGrid/Resend)
2. Implement follow-up reminder automation
3. Add bulk lead import from CSV
4. Google Calendar integration for meetings
