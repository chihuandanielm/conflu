# Major requirements (data/requirements.json)

The "On track to graduate" section on the Plan tab lists the courses each major requires at each Rutgers campus, by typical
year, with tick boxes saved in the browser and a link to the official page. Data 2026.11.17-2.

## Sources

Every entry names the pages it was transcribed from (`sources`) and the page students open (`pageUrl`).

| Campus | Source | Majors |
|---|---|---|
| New Brunswick | New Brunswick Undergraduate Catalog 2024–2026 (`catalogs.rutgers.edu/generated/nb-ug_2425`); SMLR's HRM page; the School of Nursing curriculum page | 21 |
| Newark | Newark Undergraduate Catalog 2022–2024 (`catalogs.rutgers.edu/generated/nwk-ug_2225`); the School of Nursing curriculum page (Newark, fall 2027) | 11 |
| Camden | Camden Undergraduate Catalog 2023–2025 (`catalogs.rutgers.edu/generated/cam-ug_2325`); School of Business–Camden HRM page; School of Nursing–Camden Traditional BSN Curriculum (2026) | 12 |

These are the newest catalog editions Rutgers serves as readable pages. The 2025–26 catalogs moved to a new site that
didn't serve pages when this was built (November 2026), so each entry links to the edition it was taken from, and the
section tells students to confirm with their adviser and the official page.

## How years are set

- `sequence: "official"`: the school publishes a year-by-year or semester-by-semester curriculum (engineering, nursing,
  pharmacy, social work, Newark computer science, Camden economics). Years follow it.
- `sequence: "prerequisites"`: no published sequence. Years follow course level (100-level in year 1, 200 in year 2, 300 in
  year 3, 400 in year 4), except where the page itself says when to take a course (for example, Rutgers Business
  School–Newark's prerequisite core "within the first year of admittance"). The section says so on the page.

## Rules for editing

- Only what an official page says: course numbers, titles and credits as printed (titles come from the catalog's course
  listings when the requirement page gives only numbers). Where a page gives titles without numbers (Camden HRM), the item
  has a title and no number.
- `npm run validate` checks that every major at every campus that offers it has exactly one entry, that years are 1–6 or
  open, that every course has a title, and that links are https.
- Bump `data/version.json` on any change.
