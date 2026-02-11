

## Anika Automated Outreach Engine Upgrade

Evolve the existing Nurture Engine into a full "Anika Automated Outreach Engine" with auto-pilot tracking, a "Needs Attention" inbox, dynamic template variables, upgraded bifurcation actions, and a manual-mode toggle.

---

### What Changes

**1. Rebrand and Restructure Tabs**

Rename the page header to "Anika Outreach Engine." Restructure the tabs to:

- **Sequences** (was "Sequence Tracker") -- shows leads on auto-pilot with a summary count header ("12 leads in Auto-Pilot")
- **Needs Attention** (new) -- lists leads where `response_status = 'replied'` or `'interested_call'`. This is the salesperson's morning to-do list
- **Follow-Up Today** (existing) -- unchanged functionality
- **Template Library** (existing) -- upgraded with variable interpolation

**2. Manual Mode Toggle**

Add a Switch toggle on each lead card in the Sequences tab. When toggled ON:
- Sets a new `manual_mode` boolean column on `lead_sequences` to `true`
- All pending sequence steps for that lead get status changed to "paused"
- The lead card shows a "Manual" badge instead of the progress bar
- When toggled OFF, steps resume as "pending"

This is the "Stop" trigger -- when a lead replies, the dispatcher clicks this toggle.

**3. Needs Attention View**

A new tab that queries `lead_sequences` where `response_status IN ('replied', 'interested_call')` and shows:
- Lead name, company, hub, industry
- Which step triggered the reply
- The dispatcher's note (if any)
- Three action buttons (the new bifurcation set -- see below)

**4. Upgraded Bifurcation Actions (3 Big Buttons)**

Replace the current 3 bifurcation buttons on the "Needs Attention" view with sales-focused actions:

| Button | Action |
|---|---|
| "Interested - Schedule Call" | Move lead to `negotiation` stage, create task "Schedule call with [company]", mark sequence completed |
| "Not Now - Nurture" | Set `follow_up_date` to +30 days, set `response_status = 'nurture_30d'`, keep lead in new_lead stage |
| "Operational Review" | Move lead to `operational_review` stage, create task "Pre-flight checklist: docks/white-glove for [company]" |

The original bifurcation buttons (No Response / Replied / Interested in Call) remain on the Sequence Tracker and Follow-Up Today tabs for step-level actions.

**5. Dynamic Template Variables**

Upgrade the template body display and copy-to-clipboard to automatically replace placeholders:
- `[Name]` replaced with `lead.contact_person`
- `[Company]` replaced with `lead.company_name`
- `[City Hub]` replaced with `lead.city_hub`
- `[Industry]` replaced with `lead.industry`

When a template suggestion appears inline on a sequence step, the variables are already filled in based on the lead's data before copying.

**6. Auto-Pilot Cadence Update**

Change the default sequence timing to match the Anika methodology:
- Day 1: Introduction email
- Day 4: Social Proof email  
- Day 8: Low Friction Offer email

Update `nurture_settings` defaults: `email1_to_email2_days = 3` (Day 1 to Day 4), `email2_to_call_days = 4` (Day 4 to Day 8). These match the existing defaults, so no DB change needed -- just rename step labels:
- `email_1` displays as "Day 1 - Introduction"
- `email_2` displays as "Day 4 - Social Proof"  
- `call` displays as "Day 8 - Low Friction Offer"

**7. Sequence Progress Label**

Enhance the existing `SequenceProgressBar` to show a text label like "2/3 sent" next to the colored segments.

**8. Notification Badge**

Add an orange notification dot on the "Nurture Engine" sidebar item when there are leads with `response_status = 'replied'` that haven't been actioned yet. This is queried on app load and stored in context/state. For now this is a polling check (every 60 seconds), mocked as the prompt suggests.

---

### Database Changes

**Add column to `lead_sequences`:**

```text
ALTER TABLE lead_sequences ADD COLUMN manual_mode boolean NOT NULL DEFAULT false;
```

No other schema changes needed. The `response_status` column already supports free-text values, so `'nurture_30d'` works without migration.

---

### Files Changed

| File | Change |
|---|---|
| `supabase/migrations/...` | Add `manual_mode` column to `lead_sequences` |
| `src/pages/NurtureEngine.tsx` | Rebrand header, add "Sequences" and "Needs Attention" tabs, manual mode toggle, dynamic template variables, upgraded bifurcation buttons, progress label, updated step labels |
| `src/components/AppSidebar.tsx` | Add notification badge (orange dot) on Nurture Engine nav item with reply count polling |

---

### Technical Notes

- The manual mode toggle uses Supabase to bulk-update all pending steps for a lead: `UPDATE lead_sequences SET manual_mode = true, status = 'paused' WHERE lead_id = X AND status = 'pending'`
- Dynamic variable replacement is a simple string `.replace()` at render/copy time -- no DB changes needed
- The "Needs Attention" query: `SELECT * FROM lead_sequences WHERE response_status IN ('replied', 'interested_call') AND status != 'completed'` joined with leads
- Notification badge polls `lead_sequences` count where `response_status = 'replied' AND status = 'pending'` every 60 seconds
- The 3 new bifurcation buttons only appear in the "Needs Attention" tab; the original buttons stay on the other tabs
- `nurture_30d` as a response_status value works with existing free-text column

