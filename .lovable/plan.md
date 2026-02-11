

## Hyper-Local Hub CRM + SOP Wiki

This plan adds 5 features: city-hub filtering, industry tagging, a hotshot radius checker, ghosting alerts on lead cards, and a full SOP Wiki section.

---

### 1. Database Migration

A single migration adds the new columns and the SOP wiki table:

```text
-- Add city_hub and industry columns to leads
ALTER TABLE leads ADD COLUMN city_hub text NULL;
ALTER TABLE leads ADD COLUMN industry text NULL;
ALTER TABLE leads ADD COLUMN delivery_points text NULL;

-- SOP Wiki table
CREATE TABLE sop_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sop_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view SOPs" ON sop_articles FOR SELECT USING (true);
CREATE POLICY "Authenticated can create SOPs" ON sop_articles FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated can update SOPs" ON sop_articles FOR UPDATE USING (true);
CREATE POLICY "Authenticated can delete SOPs" ON sop_articles FOR DELETE USING (true);

CREATE TRIGGER update_sop_articles_updated_at
  BEFORE UPDATE ON sop_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- `city_hub`: stores "miami", "phoenix", or "la"
- `industry`: stores "medical_pharma", "legal", "auto_parts", or "ecommerce_last_mile"
- `delivery_points`: free-text field for the lead's common delivery addresses (used by the radius checker)

---

### 2. City-Hub Partitioning (Pipeline UI)

- Add a row of filter buttons above the Kanban board: **All | Miami | Phoenix | LA**
- Clicking a city filters leads to only show cards where `city_hub` matches
- Add a "City Hub" dropdown (Miami / Phoenix / LA) to the Add/Edit Lead form
- Show a small city badge on each lead card

**Constants update** (`src/lib/constants.ts`): Add `CITY_HUBS` and `INDUSTRIES` arrays.

---

### 3. Industry Tagging

- Add an "Industry" dropdown to the Add/Edit Lead form with options: Medical/Pharma, Legal, Auto Parts, E-commerce/Last-Mile
- Display a colored industry badge on each lead card
- Add industry to the filter bar (can combine with city filter)

---

### 4. Hotshot Radius Validator

- Add a small "Action Zone" button on each lead card (or in the lead detail dialog)
- When clicked, it checks the `delivery_points` text against the 3 hub cities
- Uses a simple keyword/city matching approach (no external API needed): if the delivery points mention cities within approximately 300 miles of Miami, Phoenix, or LA, it shows a green "In Zone" badge; otherwise a red "Out of Zone" badge
- This is a quick visual indicator, not a precise GPS calculation

---

### 5. Ghosting Alerts (10-Day No-Contact Warning)

- On each lead card, calculate the time since the last interaction (query `lead_interactions` for the most recent `created_at` per lead)
- If no interaction exists or the last one was more than 10 days ago:
  - Card border turns Safety Orange (#FF6700)
  - A CSS shake animation plays on the card
  - A "No contact in X days" warning badge appears
- The Pipeline component will fetch last-interaction dates alongside leads

---

### 6. SOP Wiki Page

- Create new page `src/pages/SopWiki.tsx`
- Add route `/sop-wiki` to `App.tsx`
- Add "SOP Wiki" nav item to sidebar under a new "Resources" group
- The page includes:
  - A list/grid of articles with category filter tabs (General, Last-Mile, Hotshot, Onboarding)
  - A "New Article" button that opens a dialog with title, category dropdown, and a rich text area (using a Textarea for simplicity)
  - Click an article to view it in a detail dialog with Edit and Delete options
  - Search bar to filter articles by title

---

### Technical Details

**Files to modify:**

| File | Changes |
|---|---|
| `src/lib/constants.ts` | Add `CITY_HUBS`, `INDUSTRIES`, `SOP_CATEGORIES` constants |
| `src/pages/Pipeline.tsx` | Add city/industry filters, form fields, ghosting alert logic, radius validator button, update Lead type |
| `src/App.tsx` | Add `/sop-wiki` route |
| `src/components/AppSidebar.tsx` | Add SOP Wiki nav item under "Resources" group |

**Files to create:**

| File | Purpose |
|---|---|
| `src/pages/SopWiki.tsx` | Full SOP Wiki page with CRUD, search, and category filtering |

**New constants:**

```text
CITY_HUBS = [
  { value: "miami", label: "Miami" },
  { value: "phoenix", label: "Phoenix" },
  { value: "la", label: "Los Angeles" },
]

INDUSTRIES = [
  { value: "medical_pharma", label: "Medical/Pharma" },
  { value: "legal", label: "Legal" },
  { value: "auto_parts", label: "Auto Parts" },
  { value: "ecommerce_last_mile", label: "E-commerce/Last-Mile" },
]

SOP_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "last_mile", label: "Last-Mile" },
  { value: "hotshot", label: "Hotshot" },
  { value: "onboarding", label: "Onboarding" },
]
```

**Ghosting alert approach:** Fetch the latest interaction date per lead using a separate query (`SELECT lead_id, MAX(created_at) FROM lead_interactions GROUP BY lead_id`), then compare client-side. Cards older than 10 days get `animate-[shake_0.5s_ease-in-out_infinite]` and an orange border via `border-l-[#FF6700]`.

