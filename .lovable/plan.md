
# User Management & Role-Based Access Control

## Overview
Build a complete user management system where Owners can create and manage team members, assign roles (Owner/Dispatcher), and enforce strict visibility rules so dispatchers only see their own assigned work.

---

## Current State

- One user exists (Dayron Santiesteban, info@anikalogistics.com)
- The `user_roles` table and `has_role()` function already exist but **no roles are assigned yet**
- The `useUserRole` hook exists and is used in the Task Board for filtering
- Signup is open on the Auth page (anyone can create an account)
- Dashboard, Pipeline, and other pages show ALL data to everyone

---

## What We'll Build

### 1. Assign Existing User as Owner
Insert Dayron's role as "owner" in the `user_roles` table so the system recognizes him as an admin immediately.

### 2. Owner-Only "Team Management" Page
A new `/team` page (visible only to Owners in the sidebar) where Owners can:
- **Invite new users** by entering email, full name, and role (owner or dispatcher)
- **View all team members** with their roles and status
- **Change a user's role** (promote dispatcher to owner or vice versa)
- **Remove users** from the team

User creation will use a backend function that creates the account via the Admin API (service role) and assigns the role automatically.

### 3. Disable Public Signup
Remove the "Sign up" option from the Auth page. Only Owners can create new users through the Team Management page. This prevents unauthorized accounts.

### 4. Role-Based Visibility Across All Pages

| Page | Owner Sees | Dispatcher Sees |
|------|-----------|-----------------|
| Dashboard | All stats, all tasks, all activity | Only their assigned tasks, global lead stats |
| Pipeline | All leads | All leads (sales is collaborative) |
| Task Board | All tasks (already works) | Only their assigned tasks (already works) |
| Calendar | All events/tasks | Only their own tasks |
| Companies | All (shared CRM data) | All (shared CRM data) |
| Contacts | All (shared CRM data) | All (shared CRM data) |
| SOP Wiki | All articles | All articles (read-only, no create/edit) |
| Nurture Engine | Full access | Read-only or hidden |
| Team Management | Full access | Hidden from sidebar |

### 5. Sidebar Conditional Navigation
Hide "Team Management" and optionally "Nurture Engine" links for dispatchers.

### 6. Backend Function for User Invites
Create an Edge Function `invite-user` that:
- Validates the caller is an Owner (JWT check + role check)
- Creates the user via Supabase Admin API (`auth.admin.createUser`)
- Inserts a row in `user_roles`
- Sends an invite/password-reset email so the new user can set their password

---

## Technical Details

### New Files
- `src/pages/TeamManagement.tsx` -- Owner-only page for managing users
- `supabase/functions/invite-user/index.ts` -- Edge Function for secure user creation

### Files to Modify
- `src/components/AppSidebar.tsx` -- Add Team Management link (owner-only), hide items for dispatchers
- `src/App.tsx` -- Add `/team` route
- `src/pages/Auth.tsx` -- Remove signup toggle, login-only
- `src/pages/Dashboard.tsx` -- Filter tasks/activity by role
- `src/pages/CalendarView.tsx` -- Filter by assigned_to for dispatchers
- `src/pages/SopWiki.tsx` -- Hide create/edit for dispatchers
- `src/pages/NurtureEngine.tsx` -- Restrict access for dispatchers

### Database Changes
- INSERT Dayron's owner role into `user_roles`
- No schema changes needed (tables already exist)

### Security Model
- User creation goes through a secure Edge Function (service role, JWT-validated)
- Role checks use the existing `has_role()` security definer function
- RLS policies already enforce ownership rules on data mutations
- Frontend hides UI elements based on role, but backend enforces the real rules
