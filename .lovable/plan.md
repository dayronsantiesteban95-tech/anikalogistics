

## Sales Nurture Engine

Add a dedicated "Nurture" page to the CRM that manages pre-qualification outreach with sequence tracking, decision-tree logic, a template library, and a "follow-up today" view.

---

### Overview

The Nurture Engine is a new page accessible from the sidebar under "Operations." It has **3 tabs**:

1. **Follow-Up Today** (default) -- shows all leads needing action today based on their sequence follow-up dates
2. **Sequence Tracker** -- per-lead view of outreach steps (Email 1, Email 2, Call) with bifurcation actions
3. **Template Library** -- pre-written emails organized by Hub (Miami, Phoenix, LA) that dispatchers can copy/paste

---

### Database Changes

**Add a `response_status` column to `lead_sequences`** to support bifurcation logic:

```text
ALTER TABLE lead_sequences ADD COLUMN response_status text DEFAULT 'no_response';
-- Values: 'no_response', 'replied', 'interested_call'
```

No other table changes needed. The existing `lead_sequences` table already has `step_type`, `status`, `sent_at`, and `follow_up_date`. The existing `email_templates` table already has `name`, `hub`, `step_type`, `subject`, and `body`.

---

### New Page: `src/pages/NurtureEngine.tsx`

**Tab 1: Follow-Up Today**
- Query `lead_sequences` where `follow_up_date <= today` and `status = 'pending'`
- Join with `leads` to show company name, contact person, hub, industry
- Each row shows: lead name, step type (Email 1 / Email 2 / Call), days overdue
- Leads with `response_status = 'interested_call'` get a green highlight
- Click a lead to open inline action panel

**Tab 2: Sequence Tracker**
- Shows all leads in `new_lead` stage with their outreach sequence
- Each lead row expands to show a timeline: Email 1 -> Email 2 -> Call
- Each step shows status (pending / sent / skipped) with sent date
- **Bifurcation Actions** on each step (3 buttons):
  - "No Response" -- sets `follow_up_date` to 3 days from now, keeps status pending
  - "Replied" -- moves lead stage to `qualified`, creates a task "Call [company]" assigned to dispatcher, shows toast alert
  - "Interested in Call" -- sets `response_status = 'interested_call'`, highlights lead green in all views
- Button to "Start Sequence" for a lead (creates Email 1, Email 2, Call steps with staggered follow-up dates)

**Tab 3: Template Library**
- Grid of template cards grouped by Hub (Miami / Phoenix / LA tabs or filter)
- Each card shows: template name, step type badge, subject line preview
- Click to expand and see full body with a "Copy to Clipboard" button
- Owners can add/edit/delete templates; dispatchers can only view and copy
- "New Template" form: name, hub selector, step type (email_1, email_2, call_script), subject, body

---

### Bifurcation Logic Detail

When a dispatcher acts on a sequence step:

| Response | Action |
|---|---|
| No Response | Set `follow_up_date = today + 3 days`, keep `status = 'pending'` |
| Replied | Update lead `stage = 'qualified'`, create task "Call [company] - they replied!", mark sequence step `status = 'completed'` |
| Interested in Call | Set `response_status = 'interested_call'`, sequence step stays active, lead card gets green border everywhere |

---

### Routing and Navigation

- New route: `/nurture` in `App.tsx`
- New sidebar item: "Nurture Engine" with `Zap` icon, added under "Operations" group in `AppSidebar.tsx`

---

### Files Changed

| File | Change |
|---|---|
| `supabase/migrations/...` | Add `response_status` column to `lead_sequences` |
| `src/pages/NurtureEngine.tsx` | New page with 3 tabs |
| `src/App.tsx` | Add `/nurture` route |
| `src/components/AppSidebar.tsx` | Add "Nurture Engine" nav item |
| `src/pages/Pipeline.tsx` | Add green border for leads with `interested_call` status (query `lead_sequences` for the flag) |

---

### Technical Notes

- The `lead_sequences` table already supports `step_type` as free text; we'll use values like `email_1`, `email_2`, `call`
- The `email_templates` table already has `hub` and `step_type` columns -- perfect fit
- "Start Sequence" auto-creates 3 rows in `lead_sequences`: email_1 (today), email_2 (today+3), call (today+7)
- The "Follow-Up Today" query uses `follow_up_date <= CURRENT_DATE` to catch overdue items too
- Copy-to-clipboard uses the browser `navigator.clipboard.writeText()` API
- Green highlight uses Tailwind `border-l-green-500` class conditionally

