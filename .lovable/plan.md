

## Anika Velocity Pipeline Stages

Replace the current 5-stage pipeline with the 7-stage "Anika Velocity" flow designed for last-mile logistics.

### Stage Mapping

| Current Stage | New Stage | Description |
|---|---|---|
| New Lead | New Lead | Raw data (inquiry, cold list, referral) |
| First Contact | Qualified / Needs Analysis | Confirmed local volume, know what they ship |
| Quote Sent | Quote Sent / Proposal | Hotshot or Standard Courier rates sent |
| Negotiation | Operational Review | Dispatchers check locations, dock access, White-Glove needs |
| Account Won | Trial Run / Pilot | 1-3 test deliveries to prove speed |
| *(new)* | Account Active | Recurring client |
| *(new)* | Retention / Quarterly Check-in | Ensure we stay their #1 choice |

---

### Changes

**1. Database migration** -- Add the 3 new enum values to `lead_stage`:

```text
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'qualified';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'operational_review';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'trial_run';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'account_active';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'retention';
```

The old values (`first_contact`, `negotiation`, `account_won`) remain in the enum so existing leads don't break, but the UI will show the new stage names.

**2. Update `src/lib/constants.ts`** -- Replace the `LEAD_STAGES` array:

```text
LEAD_STAGES = [
  { value: "new_lead", label: "New Lead" },
  { value: "qualified", label: "Qualified / Needs Analysis" },
  { value: "quote_sent", label: "Quote Sent / Proposal" },
  { value: "operational_review", label: "Operational Review" },
  { value: "trial_run", label: "Trial Run / Pilot" },
  { value: "account_active", label: "Account Active" },
  { value: "retention", label: "Retention / Check-in" },
]
```

**3. Update `src/pages/Pipeline.tsx`** -- The Kanban board already renders columns dynamically from the `LEAD_STAGES` constant, so it will automatically show 7 columns. Minor adjustments:
- Slightly narrower column min-widths to fit 7 stages on screen
- Add horizontal scroll if needed for smaller viewports

**4. Migrate existing lead data** -- Any leads currently in `first_contact`, `negotiation`, or `account_won` will still display but won't have a visible column unless we map them. We'll update existing leads to the new stages:

```text
UPDATE leads SET stage = 'qualified' WHERE stage = 'first_contact';
UPDATE leads SET stage = 'operational_review' WHERE stage = 'negotiation';
UPDATE leads SET stage = 'account_active' WHERE stage = 'account_won';
```

This ensures no leads are orphaned in invisible columns.

