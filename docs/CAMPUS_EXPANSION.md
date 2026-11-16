# Campus expansion: Rutgers–Newark, Rutgers–Camden, and Packaging Engineering

Status: design for data version 2026.11.16-1 and engine 0.4.0.
Scope: add Rutgers–Newark and Rutgers–Camden alongside Rutgers–New Brunswick, then add the Packaging Engineering major (New Brunswick only).

---

## 1. What was New Brunswick-only, and why that matters

| Layer | How NB is baked in today | Effect on a Newark or Camden student |
|---|---|---|
| `majors.json` | One `school` and `url` per major, all NB schools | Shows majors their campus doesn't offer (Pharmacy, the engineering majors) |
| Resources | 63 `scope: "rutgers"` entries, almost all NB offices, labs, and clubs | Sends them to the wrong career office (CES), research office (Aresty), food pantry, Handshake portal, and so on |
| Goals | 7 goals point at `rutgers-ces`, 6 at `rutgers-handshake`, 3 at Aresty; 4 titles name NB things ("Meet a CES career advisor") | Wrong office names on their plan |
| Engine | `school: "rutgers-nb"` adds +3 to every `scope: "rutgers"` resource; any other value only removes the bonus | No way to pick the right campus; non-Rutgers students still see Rutgers-only offices |
| Intake | "Rutgers–New Brunswick" or "Another school", asked after the major, optional | Can't express Newark or Camden; the major list can't depend on campus |

The fix is a campus dimension that runs through data, engine, and UI, rather than three copies of the dataset. Goals, tracks, competencies, and national/NJ resources are campus-neutral and stay shared.

## 2. Data model

### 2.1 `data/campuses.json` (new)

```json
{ "campuses": [
  { "id": "nb",     "name": "Rutgers–New Brunswick", "school": "rutgers-nb",     "city": "New Brunswick" },
  { "id": "newark", "name": "Rutgers–Newark",        "school": "rutgers-newark", "city": "Newark" },
  { "id": "camden", "name": "Rutgers–Camden",        "school": "rutgers-camden", "city": "Camden" } ] }
```

`school` is the `PlanInput.school` value. `"rutgers-nb"` stays exactly as it was, so saved plans and share links keep working.

### 2.2 Majors: `offeredAt`

`school` and `url` move into a per-campus map. A major appears in the intake for a campus only if it has an entry there.

```json
{ "id": "nursing", "name": "Nursing", "cip": "51.3801", "cluster": "health-life", "industries": [...],
  "offeredAt": {
    "nb":     { "school": "Rutgers School of Nursing", "url": "https://nursing.rutgers.edu" },
    "newark": { "school": "Rutgers School of Nursing", "url": "..." },
    "camden": { "school": "Rutgers School of Nursing–Camden", "url": "..." } } }
```

Only programs confirmed by research get an entry. A close but different program (for example, Newark's business analytics instead of NB's Information Technology) is **not** mapped to an existing major. The dataset doesn't pretend two programs are the same.

### 2.3 Resources: `campuses`

Every `scope: "rutgers"` resource gets `campuses`: `["nb"]`, `["newark"]`, `["camden"]`, a combination, or `["all"]` (open to students at any campus). Other scopes don't carry it; NJ and national resources apply everywhere. The validator enforces this.

Classification rule: who can actually use it. A New Brunswick research center that hires its own campus's students is `["nb"]`. A program open to any Rutgers undergraduate (for example, CAWP's NEW Leadership, open to any NJ undergraduate) is `["all"]`. When in doubt, the narrower campus list wins: showing a Newark student an office they can't use is the failure this change exists to prevent.

### 2.4 File organization

```
data/resources/
  rutgers-new-brunswick.json   (was rutgers.json; ids unchanged)
  rutgers-newark.json          (new)
  rutgers-camden.json          (new)
  majors-*.json, national-*.json, new-jersey.json, ...  (Rutgers entries gain "campuses")
  majors-packaging.json        (new: packaging societies, competitions, employers)
```

Resources open to every campus (`campuses: ["all"]`, such as Rutgers EOF, study abroad, CAWP, HackRU, NJ STEP, and Eagleton's Undergraduate Associates) stay in the file they were already in, so their history stays readable.

Ids never change, because goals, saved plans (`previousPlan`, `completedGoals`), and tests refer to them.

### 2.5 Goals

- **Campus-neutral wording:** "Meet a CES career advisor" becomes "Meet a career advisor and sketch a 4-year plan", and "Do a mock interview with CES" becomes "Do a mock interview with your career center". Student media gets generic wording, and "Rutgers employers" becomes "your campus's employers". Ids stay the same.
- **Campus equivalents in resource lists:** every goal that points at an NB office also lists the Newark and Camden equivalents (`f-ces-advisor`: `rutgers-ces`, `rutgers-newark-career`, `rutgers-camden-career`). The engine's campus filter picks the right one, so one goal serves all three campuses.

## 3. Engine 0.4.0

Additions and changes, each covered by a test written first:

1. `campusOf(school)`: `"rutgers-nb"`, missing, or unknown values map to `"nb"`, matching today's default. `"rutgers-newark"` maps to `"newark"`, `"rutgers-camden"` to `"camden"`, and `"other"` to `null`.
2. `availableAt(resource, input)`: true for every non-Rutgers resource. For a Rutgers resource, true only when the student's campus is in `campuses` (or `campuses` includes `"all"`). For a student at another school, no Rutgers resource is available.
3. **Resource cards** (`rankResources`) filter by `availableAt` before ranking.
4. **The identity eligibility boost** (`identityMatch`) only counts resources the student can use.
5. **The "all programs need citizenship" goal skip** (`citizenshipBlocked`) only looks at resources the student can use.
6. **Ranking is unchanged:** +3 for a Rutgers resource still applies, and it now always means "your campus".

The academic calendar (`CALENDAR`) is university-wide, so `currentTerm` doesn't change.

Invariant for NB students: plans are identical except where the campus-neutral goal wording changed. A test pinned this down by comparing 324 NB plans before and after on goal ids, terms, hours, and backlog; it is now the general NB baseline (`test/fixtures/nb-plans-baseline.json`), re-recorded only for intended planning changes.

## 3.1 Known gaps (left empty rather than guessed)

Research couldn't confirm a Newark student newspaper or radio station, a Newark computing club, or a Camden McNair office, so those cards show only NJ and national options (or nothing) for those campuses. Newark's social work BA appears discontinued, so Social Work is listed for New Brunswick and Camden only. Close-but-different programs (Newark's journalism and media studies, information systems, and Camden's health sciences) aren't mapped to existing majors.

## 4. Intake and site

- **Campus question:** "Which Rutgers campus are you at?" moves to the second question, right after status, because the major list depends on it. Options: New Brunswick, Newark, Camden, or Another school. "Another school" shows every major and only NJ and national resources.
- **Major list:** filtered to `offeredAt[campus]`. A campus change that invalidates the chosen major clears it.
- **Results:** the summary line names the campus. The resources tab labels Rutgers entries by campus ("Rutgers–Camden", "Rutgers (all campuses)"), and the PDF cover lists the campus.
- **Share links:** carry the campus and validate the major against it.
- **Tailored resources:** use `availableAt`, the same function as the engine, so the tab and the plan can't disagree.

## 5. Packaging Engineering

- **Major:** `packaging-engineering`, offered only at NB, in the School of Engineering. CIP code from research.
- **Track:** "Packaging engineering and consumer products", with its own competency target, boosts, and a must-do target internship or co-op.
- **Goals:** a few packaging-specific goals (join the student packaging society, enter a packaging design competition, get packaging testing exposure), each tied to researched resources.
- **Existing goals:** packaging is added to the engineering-only goals where it applies (design-team style work, CAD and SOLIDWORKS, co-op), based on the curriculum.
- **Other tracks:** packaging is added to the `suggestedMajors` of related tracks (mechanical design, supply chain, pharma industry, medical devices).

## 6. Verification

- Validator: campus ids, `offeredAt`, `campuses` required on Rutgers resources, goal resource references, vocab.
- Engine tests across all three campuses and "other":
  - no wrong-campus resource ever appears
  - every track × year × campus-available major passes the core invariants
  - NB plans are stable
  - identity-only-adds still holds
  - packaging plans work
- UI tests: campus question, major filtering, labels. End-to-end: a Newark or Camden run.
- Links: every new URL is web-search confirmed before it goes in, then checked live by the CI link checker on push. Results are folded back in as in the earlier link work.
