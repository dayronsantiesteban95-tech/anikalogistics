

# Functional Logic, UX, and Edge Case Hardening

## Overview
This plan addresses six areas: fixing the CRM-to-Task data link, adding automation safety (stop switch), improving empty states, adding form validation with error messages, and adding skeleton loading states. The "Total Pipeline Value" item is noted as not applicable since the database has no estimated value field on leads.

---

## 1. CRM to Task Sync Fix (Race Condition)

**File:** `src/pages/TaskBoard.tsx`

**Problem:** When creating a task linked to a lead, the code inserts the task and then queries for the "most recent task" to get its ID. This is a race condition -- two simultaneous creates could link the wrong task.

**Fix:**
- Change the insert call to use `.select("id").single()` which returns the newly created row's ID directly
- Use that ID to insert into `task_lead_links`
- Show the linked lead name on task cards by fetching `task_lead_links` and joining with leads

**Changes:**
- Refactor `handleSubmit` to capture the inserted task ID from the insert response
- Fetch `task_lead_links` alongside tasks and display a small badge on linked task cards showing the lead company name

---

## 2. Pipeline Value -- Not Applicable

The leads table has `estimated_monthly_loads` but no monetary `estimated_value` column. The Dashboard does not show a "Total Pipeline Value" stat, so there is no dummy data to replace. If you want a pipeline value metric in the future, a new column would need to be added to leads.

---

## 3. Automation Safety -- Stop Switch

**File:** `src/pages/NurtureEngine.tsx`

**Problem:** When a lead replies or shows interest (handleReplied, handleInterestedCall), only the clicked step is marked "completed." Other pending/paused steps for the same lead remain active and will surface in Follow-Up Today.

**Fix:** In both `handleReplied` and `handleInterestedCall`, after marking the current step as completed, also mark ALL other pending/paused steps for the same lead as "completed" with response_status "stopped":

```sql
UPDATE lead_sequences 
SET status = 'completed', response_status = 'stopped'
WHERE lead_id = X AND status IN ('pending', 'paused') AND id != current_step_id
```

This ensures the entire sequence stops when a lead engages.

---

## 4. Empty States

Add friendly empty state messages with icons to these locations:

| Location | Current | New |
|----------|---------|-----|
| TaskBoard -- each column | Shows nothing when empty | "No tasks here yet" with a clipboard icon |
| Dashboard -- Pipeline Funnel chart | Empty chart | "No leads in pipeline yet" message |
| NurtureEngine -- Follow-Up Today tab | No explicit empty state | "All caught up! No follow-ups due today." |
| NurtureEngine -- Needs Attention tab | No explicit empty state | "No leads need attention right now." |

Files: `src/pages/TaskBoard.tsx`, `src/pages/Dashboard.tsx`, `src/pages/NurtureEngine.tsx`

---

## 5. Form Validation with Error Messages

### New Lead Form (`src/pages/Pipeline.tsx`)
- Company Name: already required -- add red error text if empty on submit
- Contact Person: already required -- add red error text
- Phone: add pattern validation accepting only digits, dashes, parentheses, spaces, and plus sign. Show red "Invalid phone number" if pattern fails
- Email: already uses `type="email"` -- add red error text on invalid

### New Task Form (`src/pages/TaskBoard.tsx`)
- Title: already required -- add red error text
- Add a simple client-side validation state that shows inline red error messages below fields when validation fails on submit

### Implementation approach:
- Add a `formErrors` state object to each form
- Validate on submit before calling the API
- Show `<p className="text-xs text-destructive mt-1">` messages under each invalid field
- For phone fields, use regex pattern: `/^[+]?[\d\s()-]*$/`

---

## 6. Loading / Skeleton States

Add skeleton loaders to all data-fetching pages. Use the existing `Skeleton` component from `src/components/ui/skeleton.tsx`.

| Page | What to skeleton |
|------|-----------------|
| Dashboard | Stat cards (6 skeleton rectangles), charts (2 skeleton blocks), task list |
| Pipeline | Kanban columns with 2-3 skeleton cards each |
| TaskBoard | Board columns with 2-3 skeleton cards each |
| Contacts | Table rows (5 skeleton rows) |
| Companies | Table rows (5 skeleton rows) |
| NurtureEngine | Lead list (3 skeleton cards) |

**Implementation:** Add a `loading` boolean state (default `true`) to each page. Set it to `false` after the initial fetch completes. When `loading` is true, render skeleton placeholders instead of the actual content.

---

## Technical Summary

### Files to Modify
1. `src/pages/TaskBoard.tsx` -- Race condition fix, empty states per column, form validation, skeleton loader
2. `src/pages/Pipeline.tsx` -- Phone validation, form error messages, skeleton loader
3. `src/pages/NurtureEngine.tsx` -- Stop switch logic in handleReplied/handleInterestedCall, empty states for tabs, skeleton loader
4. `src/pages/Dashboard.tsx` -- Empty state for pipeline chart, skeleton loader for stat cards and charts
5. `src/pages/Contacts.tsx` -- Skeleton loader for table
6. `src/pages/Companies.tsx` -- Skeleton loader for table

### No Database Changes Needed
All fixes are client-side logic and UI improvements.
