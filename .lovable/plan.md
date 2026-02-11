

## Add New Task Categories (Keep Onboarding)

Add the new task categories from the previous plan while keeping "Onboarding" as requested. The final department list will be:

| Category | Enum Value |
|---|---|
| Onboarding | `onboarding` (existing) |
| Marketing/Growth | `marketing_growth` (new) |
| Operations | `operations` (existing) |
| Fleet/Courier Mgt | `fleet_courier` (new) |
| Finance | `finance` (new) |

### Changes

**1. Database migration** -- Add new enum values to the existing `department` type:
```text
ALTER TYPE department ADD VALUE IF NOT EXISTS 'marketing_growth';
ALTER TYPE department ADD VALUE IF NOT EXISTS 'fleet_courier';
ALTER TYPE department ADD VALUE IF NOT EXISTS 'finance';
```
No existing data is affected since `onboarding`, `operations`, `prospecting`, and `clients` remain valid.

**2. Update `src/lib/constants.ts`** -- Replace the `DEPARTMENTS` array with the 5 categories (dropping `prospecting` and `clients` from the UI, but their enum values stay in the database for any existing tasks):

```text
DEPARTMENTS = [
  { value: "onboarding", label: "Onboarding" },
  { value: "marketing_growth", label: "Marketing/Growth" },
  { value: "operations", label: "Operations" },
  { value: "fleet_courier", label: "Fleet/Courier Mgt" },
  { value: "finance", label: "Finance" },
]
```

**3. No other file changes needed** -- The Task Board and Dashboard already read from the `DEPARTMENTS` constant, so they will automatically pick up the new categories in filters, dropdowns, and badges.

