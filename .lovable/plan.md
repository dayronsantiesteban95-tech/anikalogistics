
## Add Example Email Templates for Anika Outreach Engine

Create 9 example email templates (3 hubs × 3 steps) with dynamic variables that follow the Anika sales methodology.

---

### What We're Building

The system currently has:
- An empty `email_templates` table
- A template suggestion feature that automatically shows matching templates when working sequence steps (matching on `hub` and `step_type`)
- Dynamic variable replacement: `[Name]`, `[Company]`, `[City Hub]`, `[Industry]` get interpolated based on the lead's data
- A Template Library tab where owners can view, copy, and manage templates

We'll add 9 example templates representing the complete Anika outreach flow:

**Day 1 - Introduction** (Value-focused, introduce your 6-hour radius capability)
- Miami: Focus on South Florida logistics landscape
- Phoenix: Focus on Southwest delivery zones  
- LA: Focus on Southern California market

**Day 4 - Social Proof** (Case study showing success in their industry/hub)
- Miami: Medical/pharma success story in South Florida
- Phoenix: E-commerce last-mile case study
- LA: Auto parts logistical win

**Day 8 - Low Friction Offer** (Risk-free trial: beat provider's time or it's free)
- Miami: White-glove service guarantee
- Phoenix: Speed guarantee on hotshot deliveries
- LA: Cost-match guarantee on weekly loads

---

### Implementation Strategy

**Database Approach:**
We'll directly insert 9 pre-crafted email templates into the `email_templates` table using a database operation. Each template:
- Has a unique name (e.g., "Miami Day 1: Introduction")
- Is tagged with a hub (`Miami`, `Phoenix`, or `LA`)
- Is tagged with a step type (`email_1`, `email_2`, or `call`)
- Contains a subject line appropriate for the step
- Contains email body with dynamic variables `[Name]`, `[Company]`, `[City Hub]`, `[Industry]` embedded naturally

**Content Design:**
Each template follows the Anika methodology:
1. **Day 1 (email_1):** Opens with value prop ("We handle the 6-hour radius so you don't"). Uses `[City Hub]` and `[Industry]` to be contextually relevant. Soft CTA: "Check your coverage map."
2. **Day 4 (email_2):** Leads with recent win ("We just completed a hotshot for [Industry] in [City Hub]"). Shows social proof. CTA: "How we did it + your free assessment."
3. **Day 8 (call):** Low-friction offer ("Give us your hardest delivery this week. If we don't beat your time, it's on us."). Creates urgency. CTA: Action-oriented.

---

### Files Changed

| File | Change |
|---|---|
| Database (email_templates) | Insert 9 new template rows via SQL migration |

No code changes needed—the existing system already:
- Queries templates by `hub` and `step_type`
- Replaces variables at render time using `replaceTemplateVars()`
- Displays suggestions in the BifurcationButtons component
- Allows copying to clipboard with variables pre-filled

---

### Example Template Content (Abbreviated)

**Miami - Day 1 Introduction:**
- Subject: "6-hour delivery coverage in [City Hub]"
- Body: "Hi [Name], we handle all logistics in [City Hub] so you don't. Medical/pharma? Auto parts? E-commerce? We've got a truck within 6 hours of your facility..."

**Miami - Day 4 Social Proof:**
- Subject: "We just nailed a hotshot for [Industry] in [City Hub]"
- Body: "Hi [Name], yesterday we completed an emergency medical shipment from Miami to Jacksonville in 3 hours. Your competitors took 6+..."

**Miami - Day 8 Low Friction Offer:**
- Subject: "[Company], let's prove it—risk free"
- Body: "Hi [Name], give us your hardest delivery this week. If we don't beat [Company]'s current provider's time, the delivery is free..."

(Similar patterns for Phoenix and LA with hub-specific language and industry examples)

---

### What Happens After Implementation

Once templates are inserted:
1. Owners see all 9 templates in the Template Library tab, grouped by hub
2. Dispatchers working the Sequence Tracker or Follow-Up Today tabs see template suggestions auto-loaded for each step
3. When they click "Copy," the body gets variables replaced: `[Name]` → contact name, `[Company]` → company name, etc.
4. Dispatchers can modify/use the suggested text or create their own via the "New Template" button

---

### Technical Notes

- All 9 templates will be inserted with `created_by = NULL` (system defaults) or the owner's user ID if preferred
- Templates use natural language for variables (not code variables) so they're human-readable: `[Name]` not `{{name}}`
- The `hub` field is case-sensitive in queries; we use exact capitalization: `"Miami"`, `"Phoenix"`, `"LA"`
- The `step_type` field uses: `"email_1"`, `"email_2"`, `"call"` (exact lowercase)
- Templates are industry-agnostic in language but mention logistics-specific scenarios (medical, auto parts, e-commerce) to feel authentic

