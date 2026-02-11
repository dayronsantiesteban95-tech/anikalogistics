

# Anika Operations & Growth Portal

## Overview
A high-performance internal operations tool for Anika Logistics Group combining real-time multi-city coordination, a prospecting CRM, and unified task management — built for 3 owners and 4 dispatchers.

## Team Members
- **Owners**: Dayron Santiesteban, Reinaldo Neira, Andres Villegas
- **Dispatchers**: Juan Pedraza, Daniela Villegas, Rosalia Dominguez, Dana Perez

---

## 1. Backend Setup (Lovable Cloud / Supabase)
- **Authentication** with email/password for all 7 team members
- **Role system**: `owner` and `dispatcher` roles in a dedicated `user_roles` table
- **Database tables**: Profiles, Leads, Lead Interactions, Tasks, Task-Lead Links
- **Row-Level Security** so all team members can collaborate in real-time

## 2. Branding & Layout
- **Color palette**: Deep Navy Blue (#002147) primary, Safety Orange (#FF8C00) accents
- **Glassmorphism sidebar** with frosted-glass effect navigation
- **Sections in sidebar**: Dashboard, Growth Pipeline (CRM), Task Board, Calendar
- **Global header** with Anika logo/name and live timezone clocks

## 3. Global Operations Header
- Three live digital clocks: **Miami (EST)**, **Phoenix (MST)**, **Los Angeles (PST)**
- Clean sans-serif styling, always visible at the top of every page

## 4. Growth Pipeline — Prospecting CRM
- **Kanban board** with 5 columns: New Lead → First Contact → Quote Sent → Negotiation → Account Won
- **Drag-and-drop** lead cards between stages
- **Lead cards** display: Company Name, Contact Person, Phone, Email, Main Lanes, Estimated Monthly Loads
- **Interaction log** inside each lead — timestamped notes (e.g., "Called today, they move 5 loads/week")
- **Next Action date** field with automatic **red highlighting** when overdue
- Data stored in Supabase for real-time team collaboration

## 5. Unified Task & Project Management
- **Task board** (Notion/Monday.com style) with columns by status
- **Assignable** to any of the 7 team members
- **Priority levels**: Critical, High, Medium, Low (color-coded)
- **Link tasks to CRM leads** (e.g., "Prepare contract" → "ABC Manufacturing")
- **Due dates** on every task

## 6. Calendar View
- **Monthly grid view** showing all tasks by due date
- **Weekly timeline view** for detailed daily planning
- Toggle between both views
- Tasks color-coded by priority
- Click to view/edit task details

## 7. Dashboard Home
- Quick stats: total active leads, tasks due today, overdue follow-ups
- Team activity feed showing recent actions
- At-a-glance pipeline summary (leads per stage)

