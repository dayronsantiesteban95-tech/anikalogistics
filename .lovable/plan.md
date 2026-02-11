

## Nurture Engine PRE Stage Enhancements

Upgrade the Nurture Engine so the PRE outreach stage has configurable timing, template integration per step, a visual bifurcation flow, and end-of-sequence handling.

---

### What Changes

**1. Configurable Sequence Cadence**

Currently the timing is hardcoded (Email 1 = today, Email 2 = +3 days, Call = +7 days). Add a settings panel (owners only) where they can configure:
- Days between Email 1 and Email 2 (default: 3)
- Days between Email 2 and Call (default: 4)
- Days for "No Response" snooze (default: 3)

These settings are stored in a new `nurture_settings` table so they persist across sessions.

**2. Smart Template Suggestions on Each Step**

When a dispatcher is working a sequence step, the system suggests the matching template based on the lead's hub and the step type. For example, if working Email 1 for a Miami lead, it automatically shows the Miami Email 1 template with a one-click "Copy" button -- no need to switch to the Template Library tab.

**3. Visual Bifurcation Decision Tree**

Add a visual flow diagram at the top of the Sequence Tracker tab showing the decision paths:

```text
[Email 1] --No Response--> [Email 2] --No Response--> [Call]
    |                           |                        |
  Replied                    Replied                  Replied
    v                           v                        v
 QUALIFIED                  QUALIFIED                QUALIFIED
    |                           |                        |
 Interested                Interested               Interested
    v                           v                        v
 GREEN FLAG                GREEN FLAG               GREEN FLAG
```

This acts as a visual reference for dispatchers to understand the flow at a glance.

**4. End-of-Sequence Handling**

When all 3 steps are exhausted with "No Response," the lead currently just sits there. Add two options:
- **"Restart Sequence"** -- creates a new 3-step cycle with fresh dates
- **"Mark Cold"** -- moves the lead to a `cold` status and removes it from the tracker

A "Cold Leads" section appears at the bottom of the Sequence Tracker for leads marked cold, with a "Revive" button.

**5. Step-Level Notes**

Add a small text field on each bifurcation action so dispatchers can log a quick note (e.g., "Spoke with receptionist, call back Thursday"). This note gets saved to `lead_sequences` in a new `note` column.

**6. Sequence Progress Bar**

Each lead card in the tracker shows a mini progress bar (3 segments) indicating how far through the sequence they are, color-coded: gray (pending), blue (in progress), green (completed).

---

### Database Changes

**New table: `nurture_settings`**

| Column | Type | Default |
|---|---|---|
| id | uuid | gen_random_uuid() |
| setting_key | text | (required) |
| setting_value | text | (required) |
| updated_by | uuid | nullable |
| updated_at | timestamptz | now() |

RLS: All authenticated can read; only owners can insert/update/delete.

Default rows:
- `email1_to_email2_days` = "3"
- `email2_to_call_days` = "4"
- `no_response_snooze_days` = "3"

**Add column to `lead_sequences`:**

```text
ALTER TABLE lead_sequences ADD COLUMN note text;
```

---

### UI Changes in `NurtureEngine.tsx`

| Area | Details |
|---|---|
| Settings gear icon | Opens a dialog for owners to edit cadence settings |
| Sequence Tracker header | Visual decision-tree diagram rendered with styled divs (not an image) |
| Each sequence step | Shows matching template suggestion (hub + step_type match) with Copy button inline |
| Bifurcation buttons | Each button opens a small popover with optional note field before confirming |
| End-of-sequence | Shows "Restart Sequence" and "Mark Cold" buttons when all steps are completed/exhausted |
| Cold leads section | Collapsible section at bottom of tracker for leads marked cold |
| Progress bar | 3-segment bar on each lead card header |

---

### Files Changed

| File | Change |
|---|---|
| `supabase/migrations/...` | Create `nurture_settings` table with RLS; add `note` column to `lead_sequences` |
| `src/pages/NurtureEngine.tsx` | All UI enhancements: settings dialog, decision tree visual, template suggestions, note field on bifurcation, cold leads section, progress bar |

---

### Technical Notes

- Template suggestion query: match `email_templates` where `hub = lead.city_hub` and `step_type = step.step_type`
- "Mark Cold" sets a special `response_status = 'cold'` on the lead's last sequence step and is used to filter them into the cold section
- Settings are fetched once on page load and cached in state; changes take effect immediately
- The visual decision tree is built with Tailwind flexbox/grid, not a charting library
- No changes to routing or sidebar needed -- everything is within the existing Nurture Engine page

