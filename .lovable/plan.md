

# Professional Email Templates + Atlanta Hub Update

## Overview
Two changes: (1) Replace Miami with Atlanta across the entire app (timezone clock, city hubs, action zone cities, nurture engine hub labels), and (2) seed the template library with 15 professionally written email templates -- 5 per outreach step -- using real Anika Logistics Group messaging pulled from the website.

All templates will use dynamic variables `[Name]`, `[Company]`, `[City Hub]`, and `[Industry]` so they auto-personalize for every lead.

---

## Part 1: Atlanta Replaces Miami

### Files to modify:

**`src/lib/constants.ts`**
- `TIMEZONES`: Change `{ city: "Miami", ... }` to `{ city: "Atlanta", timezone: "America/New_York", abbr: "EST" }`
- `CITY_HUBS`: Change `{ value: "miami", label: "Miami" }` to `{ value: "atlanta", label: "Atlanta" }`
- `ACTION_ZONE_CITIES`: Replace the `miami` key with `atlanta` and update cities to Atlanta-area metros (Atlanta, Marietta, Decatur, Savannah, Augusta, Macon, Athens, Alpharetta, Roswell, Sandy Springs, Kennesaw, Duluth, Lawrenceville, Columbus, Chattanooga)

**`src/pages/NurtureEngine.tsx`**
- Update `HUBS` array: replace `"miami"` with `"atlanta"`
- Update `HUB_LABELS`: replace `miami: "Miami"` with `atlanta: "Atlanta"`

**`src/components/GlobalHeader.tsx`** -- No change needed (it reads from constants)

---

## Part 2: 15 Email Templates (Database Insert via Edge Function or Direct Insert)

Templates will be inserted into the `email_templates` table. Since the table requires `created_by = auth.uid()`, the templates will be added programmatically through a one-time seeder component that inserts them when triggered by the logged-in user.

### Template Structure

Each template has: `name`, `hub` (atlanta/phoenix/la), `step_type` (email_1/email_2/call), `subject`, `body`

Since 5 templates per step x 3 steps = 15 templates, and they should work across all hubs, the hub will be set to each of the 3 hubs (atlanta, phoenix, la), giving 15 x 3 = 45 total rows. However, the content is the same across hubs -- only the `[City Hub]` variable makes it location-specific. To keep it manageable and avoid bloat, I will create 5 templates per step assigned to `atlanta` as the primary hub, and the user can duplicate for other hubs via the existing template UI.

Actually, looking at the `findTemplate` function -- it matches on `hub + step_type` and returns the first match. So to have 5 options per step per hub, the user selects which one to use. The current UI shows all templates in the Template Library tab, grouped by hub. The `findTemplate` function only auto-matches ONE template per hub+step combo for the Follow-Up Today flow.

**Approach**: Create 5 templates per step for all 3 hubs (atlanta, phoenix, la). Each hub gets the same 5 variations. That is 5 x 3 steps x 3 hubs = 45 templates. To keep things practical, I will create 15 unique templates (5 per step) and replicate across all 3 hubs = 45 rows.

### Email Content (All 15 unique templates)

#### Step 1: Day 1 -- Introduction (email_1)

**Template 1 -- "The Straight Shooter"**
- Subject: `Quick question about [Company]'s deliveries`
- Body: Professional intro referencing Anika's reliability-first approach, mentioning the specific industry and city hub.

**Template 2 -- "The Problem Solver"**
- Subject: `Delivery headaches in [City Hub]? We fix those.`
- Body: Opens with a common logistics pain point, positions Anika as the solution with real-time tracking and proof of delivery.

**Template 3 -- "The Warm Referral"**
- Subject: `[Name], a quick note from Anika Logistics`
- Body: Personal tone, mentions working with similar companies in their industry, invites a conversation.

**Template 4 -- "The Value Lead"**
- Subject: `How [Industry] companies cut delivery failures by 40%`
- Body: Leads with a compelling stat/claim, ties it to Anika's service capabilities (white-glove, same-day, last-mile).

**Template 5 -- "The Local Partner"**
- Subject: `Your [City Hub] logistics partner -- quick intro`
- Body: Emphasizes local presence, TSA-trained personnel, 24/7 availability, and the "we move what matters" promise.

#### Step 2: Day 4 -- Social Proof (email_2)

**Template 1 -- "The Case Study"**
- Subject: `How we handle [Industry] deliveries in [City Hub]`
- Body: Describes a realistic scenario of handling time-sensitive deliveries, emphasizes proof of delivery and SLA compliance.

**Template 2 -- "The Numbers"**
- Subject: `Re: Quick question about [Company]'s deliveries`
- Body: Follow-up referencing the first email, shares operational capabilities (fleet types, coverage area, response times).

**Template 3 -- "The Trust Builder"**
- Subject: `[Name], just following up`
- Body: Short and human, reiterates Anika's core value -- "trust is earned through consistency" -- and offers a no-pressure conversation.

**Template 4 -- "The Service Menu"**
- Subject: `8 ways Anika can support [Company]`
- Body: Lists all service types (Last-Mile, White-Glove, AOG, Same-Day, Airport Transfers, Legal Courier, Hot Shot, Hand Carry) relevant to their industry.

**Template 5 -- "The Differentiator"**
- Subject: `What makes us different from your current provider`
- Body: Addresses common frustrations (missed ETAs, no communication, no proof), contrasts with Anika's discipline and accountability.

#### Step 3: Day 8 -- Low Friction Offer (call)

**Template 1 -- "The Pilot Offer"**
- Subject: `Let's do a trial run, [Name] -- zero commitment`
- Body: Offers a free pilot/trial delivery to demonstrate capability, zero risk framing.

**Template 2 -- "The Quick Call"**
- Subject: `15 minutes to see if we're a fit?`
- Body: Asks for a brief call, mentions specific value props relevant to their industry, easy calendar link framing.

**Template 3 -- "The Last Touch"**
- Subject: `[Name], one last thing before I go quiet`
- Body: Respectful "breakup email" style -- acknowledges they're busy, leaves the door open, provides direct contact.

**Template 4 -- "The Custom Quote"**
- Subject: `Custom logistics quote for [Company]`
- Body: Offers to prepare a tailored quote based on their volume, routes, and service needs. No obligation.

**Template 5 -- "The Direct Line"**
- Subject: `My direct line for [Company]`
- Body: Short, gives a direct phone number and availability window, very human and low-pressure.

---

## Implementation Plan

### Step 1: Update constants and NurtureEngine hub references
- Modify `src/lib/constants.ts` (TIMEZONES, CITY_HUBS, ACTION_ZONE_CITIES)
- Modify `src/pages/NurtureEngine.tsx` (HUBS array and HUB_LABELS)

### Step 2: Create a template seeder
- Add a utility function/component that inserts the 45 templates (15 unique x 3 hubs) into `email_templates` table
- This will be triggered from the Template Library tab via a "Load Anika Templates" button
- After seeding, the button disappears (checks if templates already exist)
- Templates include full professional email copy with `[Name]`, `[Company]`, `[City Hub]`, `[Industry]` variables

### Step 3: Write the actual email copy
- All 15 unique email bodies will be written with professional, human tone
- Based on real Anika website content: tagline, values, services, coverage areas
- Each email is 4-8 lines max -- concise, scannable, no fluff

### Files to modify
1. `src/lib/constants.ts` -- Hub/timezone swap
2. `src/pages/NurtureEngine.tsx` -- Hub labels + seeder button in Template Library tab
3. No database migration needed -- uses existing `email_templates` table

