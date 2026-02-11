

## SOP Wiki -- Cheat Sheet Mode Redesign

Make the SOP Wiki more user-friendly by adding a "Cheat Sheet" inline reading experience so dispatchers can quickly scan procedures without opening dialogs.

---

### What Changes

**1. Replace "click-to-open-dialog" with inline expandable cards (Accordion style)**

Instead of clicking a card and reading content in a popup dialog, each article becomes an expandable accordion card. Click the title and the full content unfolds right there -- like a cheat sheet you can scan up and down.

**2. Two view modes: Grid View and Cheat Sheet View**

- **Grid View** (current) -- compact cards for browsing, good when you have many articles
- **Cheat Sheet View** (new default) -- a single-column list of expandable accordion cards grouped by category, so dispatchers see all relevant procedures at a glance

A toggle button lets users switch between the two views.

**3. Category sections in Cheat Sheet mode**

In Cheat Sheet view, articles are grouped under category headers (General, Last-Mile, Hotshot, Onboarding). Each category is a collapsible section. When a category filter is active, only that category shows -- acting like a focused cheat sheet for that topic.

**4. Search highlights matches in content too**

Currently search only filters by title. Update it to also search within content text, so dispatchers can type "after 5 PM" and find the relevant hotshot procedure even if the title doesn't mention it.

**5. Better empty state with quick-start suggestions**

When no articles exist, show helpful prompts like "Start by adding your first Last-Mile procedure" with category-specific quick-create buttons.

**6. Keep the View Dialog for Grid mode only**

The existing click-to-view dialog stays for Grid mode. In Cheat Sheet mode, content is inline so no dialog is needed.

---

### Technical Details

**File modified:** `src/pages/SopWiki.tsx`

**Changes:**

| Area | Details |
|---|---|
| State | Add `viewMode` state: `"cheatsheet"` (default) or `"grid"` |
| Search | Update filter to also match `article.content.toLowerCase()` |
| Cheat Sheet view | Use Radix Accordion (`@radix-ui/react-accordion`, already installed) to render articles as expandable items grouped by category |
| Category grouping | Group filtered articles by `article.category`, render each group under a heading |
| View toggle | Add a small toggle button group (List icon / Grid icon) next to the search bar |
| Styling | Each accordion item shows title + category badge when collapsed; expands to show full content with edit/delete buttons inline |
| Grid view | Keeps existing card grid with click-to-view dialog behavior |

**No database changes needed.** All changes are UI-only within `SopWiki.tsx`.
