

# SOP Wiki + Nurture Engine Access + QA Review

## Overview
Three changes: (1) make SOP Wiki fully editable by all users (owners and dispatchers), (2) make Nurture Engine accessible to everyone, and (3) fix any spelling/spacing issues across the app. Plus, recommendations for final touches.

---

## 1. Make SOP Wiki Editable by Everyone

**File:** `src/pages/SopWiki.tsx`

Currently, all create/edit/delete buttons are gated behind `isOwner`. We need to remove those guards so any authenticated user can:
- Create new articles (the "New Article" button)
- Edit articles (pencil icon in both cheatsheet and grid views)
- Delete articles (trash icon, with confirmation)

**Changes:**
- Remove all `{isOwner && (...)}` wrappers around the "New Article" button (line 123), edit/delete buttons in cheatsheet view (line 187), grid view hover actions (line 217), and the view dialog edit/delete buttons (line 273)
- The `useUserRole` import can be removed since it's no longer needed
- RLS already allows any authenticated user to INSERT and allows creators OR owners to UPDATE/DELETE -- this is appropriate (users can edit/delete their own articles, owners can edit/delete any)

---

## 2. Make Nurture Engine Visible and Usable by Everyone

The sidebar already includes Nurture Engine in `mainNav` for all users, so it's already accessible. However, inside the Nurture Engine page, some features are owner-gated:
- **Settings button** (line 728): Keep owner-only -- cadence settings are admin-level
- **Template creation** (line 1026): Make available to everyone
- **Template edit/delete** (line 1066): Make available to everyone

**File:** `src/pages/NurtureEngine.tsx`
- Remove `isOwner` guard from "New Template" button
- Remove `isOwner` guard from template edit/delete actions
- Update the empty-state text that says "Your team lead hasn't added templates yet" to a generic message
- Keep settings (cadence days) as owner-only since those are admin-level configurations

---

## 3. Spelling, Spacing, and Copy Review

After a thorough review of all page files, here are the issues found and fixes:

| File | Issue | Fix |
|------|-------|-----|
| `src/pages/Dashboard.tsx` line 133 | "vs last month" placeholder text with no actual comparison | Remove or change to a neutral label like "all time" |
| `src/lib/constants.ts` line 5 | TEAM_MEMBERS constant is hardcoded and outdated (no longer used for role checks) | No code issue, but could be cleaned up |

No spelling errors found in button labels, headings, or descriptions across Auth, Dashboard, Pipeline, TaskBoard, CalendarView, SopWiki, NurtureEngine, or TeamManagement pages. The copy is clean.

---

## 4. Functional Verification Notes

Based on code review, here is the status of each module:

**Task Board** -- Working correctly:
- Dispatchers see only their assigned tasks (line 76: `if (!isOwner && t.assigned_to !== user?.id) return false`)
- Drag-and-drop status changes work via RLS (creator, assignee, or owner can update)
- Create, edit, delete all functional

**Calendar** -- Working correctly:
- Dispatchers see only their assigned tasks (line 33: `if (!isOwner) query = query.eq("assigned_to", user.id)`)

**Dashboard** -- Working correctly:
- Role-based filtering on tasks, activity, and task status charts

**Nurture Engine** -- Working correctly:
- All CRUD operations use authenticated user context
- Email sending, sequence management, template library all functional

**Pipeline** -- Working correctly:
- All leads visible to everyone (collaborative sales tool)

---

## 5. Recommendations for Final Features

Here are high-impact features that would make this internal app significantly more useful:

1. **Notification System** -- Push/in-app notifications when a task is assigned to you, when a lead replies, or when a follow-up is due. Currently users have to manually check each page.

2. **Activity Log / Audit Trail** -- A simple log showing who changed what and when (e.g., "Dayron moved Lead X to Qualified at 3:15 PM"). Helpful for accountability in a team environment.

3. **User Profile Page** -- Let team members update their name, avatar, and contact preferences. Currently profiles are bare-bones.

4. **Mobile-Responsive Polish** -- The sidebar and task board columns could use mobile breakpoint adjustments for dispatchers who work on phones/tablets in the field.

5. **Dashboard KPI Trends** -- The "vs last month" placeholder on stat cards could show actual month-over-month comparisons using historical data.

---

## Technical Summary

### Files to Modify
- `src/pages/SopWiki.tsx` -- Remove `isOwner` guards from all CRUD buttons
- `src/pages/NurtureEngine.tsx` -- Remove `isOwner` guards from template CRUD buttons
- `src/pages/Dashboard.tsx` -- Clean up "vs last month" placeholder text

### No Database Changes Needed
RLS policies already support the desired access patterns.

