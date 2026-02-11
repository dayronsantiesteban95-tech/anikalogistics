

# UI Overhaul & Lead Form Redesign

## Overview
Modernize the entire Anika Logistics CRM with the official logo, polished Cortana-inspired design, last-mile delivery metrics in the lead form, an interactive calendar date picker, and thorough end-to-end testing.

---

## 1. Add Official Logos to the Project

Copy the uploaded logo files into `src/assets/`:
- `logo-azul.png` -- blue logo for header (light mode)
- `logo-blanco.png` -- white logo for sidebar (dark background)
- `perfil-logo-azul.jpg` -- square avatar for favicon/branding

Update **GlobalHeader.tsx**: Replace the Truck icon + text with an `<img>` tag using the blue logo (`logo-azul.png`), sized to ~160px width.

Update **AppSidebar.tsx**: Add the white logo (`logo-blanco.png`) at the top of the sidebar content area, sized appropriately for the sidebar width.

---

## 2. Cortana-Inspired UI Polish

### Global Header
- Clean, minimal header with logo on the left and timezone clocks on the right
- Add subtle bottom shadow instead of hard border
- Slightly taller (h-16) for breathing room

### Sidebar
- Add the white logo at the top with padding
- Increase spacing between nav groups
- Rounded pill-style active state with the orange accent
- Smoother hover transitions
- Add a subtle separator line between groups

### Dashboard (Cortana-inspired stat cards)
- Each stat card gets a small sparkline/trend icon on the right (already has icons, enhance with subtle gradient backgrounds)
- Add "vs last month" style micro-text beneath numbers (placeholder for now)
- Rounded-2xl cards with slightly larger padding
- Subtle hover scale effect on cards

### Pipeline Kanban
- Wider column headers with colored top-border per stage (using a gradient from navy to orange across stages)
- Smoother card hover with translateY(-2px) lift effect
- Better spacing and rounded corners on kanban columns
- Stage header badges with colored dots instead of plain numbers

---

## 3. Redesign "New Lead" Form for Last-Mile Delivery

### Remove
- "Main Lanes" field (not relevant to last-mile)

### Replace/Add Last-Mile Specific Fields
- **Service Type** (select): Last Mile, Courier, White-Glove, 6-Hour Hotshot
- **Avg. Packages/Day** (number): estimated daily package volume
- **Delivery Radius (miles)** (number): typical delivery radius
- **Vehicle Type Required** (select): Cargo Van, Sprinter, Box Truck, Car/SUV
- **SLA Requirement** (text): e.g. "Same-day by 5pm", "Next-day"

### Keep existing fields
- Company Name, Contact Person, Phone, Email
- Est. Monthly Loads, City Hub, Industry
- Next Action Date (will become interactive calendar)
- Delivery Points

### Form Layout
- Organized into sections with subtle dividers:
  - "Contact Information" (company, person, phone, email)
  - "Delivery Metrics" (service type, packages/day, radius, vehicle, SLA, monthly loads)
  - "Location & Scheduling" (city hub, industry, delivery points, next action date)

---

## 4. Interactive Calendar for Next Action Date

Replace the plain `<Input type="date">` with the Shadcn **DatePicker** component (Popover + Calendar):
- Button trigger showing the selected date in a readable format (e.g. "Feb 15, 2026")
- Calendar popup with `pointer-events-auto` class for dialog compatibility
- Disable past dates for next action scheduling
- Show a placeholder "Pick a date" when empty

---

## 5. Database Migration

Add new columns to the `leads` table:
- `service_type` (text, nullable) -- values: last_mile, courier, white_glove, hotshot
- `avg_packages_day` (integer, nullable)
- `delivery_radius_miles` (integer, nullable)
- `vehicle_type` (text, nullable)
- `sla_requirement` (text, nullable)

The `main_lanes` column will be kept in the database for backward compatibility but removed from the UI form.

---

## 6. Constants Update

Add to `src/lib/constants.ts`:
- `SERVICE_TYPES` array: Last Mile, Courier, White-Glove, 6-Hour Hotshot
- `VEHICLE_TYPES` array: Cargo Van, Sprinter, Box Truck, Car/SUV

---

## 7. End-to-End Testing Plan

After implementation, manually verify:
1. Logo displays correctly in header and sidebar (both light and dark mode)
2. Create a new lead using the redesigned form -- verify all new fields save correctly
3. Test the interactive calendar date picker opens, selects dates, and saves
4. Edit an existing lead -- verify pre-populated values
5. Drag-and-drop a lead between pipeline stages
6. Verify dark mode toggle still works with new logo variants
7. Check mobile responsiveness of the redesigned form and pipeline

---

## Technical Details

### Files to Create
- `src/assets/logo-azul.png` (copy from uploads)
- `src/assets/logo-blanco.png` (copy from uploads)

### Files to Modify
- `src/components/GlobalHeader.tsx` -- logo image, styling
- `src/components/AppSidebar.tsx` -- sidebar logo, spacing, polish
- `src/pages/Pipeline.tsx` -- lead form redesign, interactive calendar, card polish, new fields
- `src/pages/Dashboard.tsx` -- card styling enhancements
- `src/lib/constants.ts` -- SERVICE_TYPES, VEHICLE_TYPES
- `src/index.css` -- minor utility class additions for hover effects

### Database Migration
- ALTER TABLE leads ADD COLUMN service_type text;
- ALTER TABLE leads ADD COLUMN avg_packages_day integer;
- ALTER TABLE leads ADD COLUMN delivery_radius_miles integer;
- ALTER TABLE leads ADD COLUMN vehicle_type text;
- ALTER TABLE leads ADD COLUMN sla_requirement text;

