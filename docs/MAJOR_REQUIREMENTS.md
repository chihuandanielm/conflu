# Major requirements (data/requirements.json)

The "On track to graduate" section on the Plan tab lists the courses each major requires at each Rutgers campus, by typical
year, with tick boxes saved in the browser and a link to the official page. Data 2026.11.23-2 (c## Sources

Every entry names the catalog it was transcribed from (`catalog`), its edition (`edition`), the date it was last checked
against that source (`checked`, YYYY-MM-DD), and the page students open (`pageUrl`). The page shows all of these:
"from the 2026–2027 New Brunswick Undergraduate Catalog (last checked November 23, 2026)", plus a line telling students who
started before fall 2026 to check their degree audit or the catalog for their entry year.

| Campus | Source | Majors |
|---|---|---|
| New Brunswick | 2026–2027 New Brunswick Undergraduate Catalog (`newbrunswick-26-27-undergrad.catalogs.rutgers.edu`); the School of Nursing curriculum page | 21 |
| Newark | 2026–2027 Newark Undergraduate Catalog (`newark-undergrad-26-27.catalogs.rutgers.edu`); the School of Nursing curriculum page (Newark, fall 2027) | 11 |
| Camden | 2026–2027 Camden Undergraduate Catalog (`camden-undergrad-26-27.catalogs.rutgers.edu`); School of Nursing–Camden Traditional BSN Curriculum (2026); Political Science from the 2023–2025 catalog (see below) | 12 |

The 2026–2027 catalogs run on Coursedog. Its pages render in the browser, so the lists were read from each catalog's own
"Download Catalog as PDF" file and checked against the live pages; every `pageUrl` was confirmed to load (HTTP 200).

- **Newark**: the online catalog has no page of its own for each major, so Newark entries link the catalog home and say to
  open the PDF and find the major's section.
- **Camden Political Science**: the 2026–2027 page has no requirements list, so the entry keeps the 2023–2025 list
  (`edition: "2023–2025"`) and says so.
- **Rutgers Business School–New Brunswick**: the core shown is for students who entered RBS in fall 2026 (33:620:369
  International Business joins the core; information systems, ethics/law, and analytics/managerial accounting are
  either-or choices, except for accounting majors).

### What changed from the older catalogs (2026-11-23)

- Engineering first year (mechanical, biomedical, packaging): 14:440:101 and 14:440:102 replace 14:440:127 and 14:440:100.
  Mechanical engineering from the class of 2030 drops 01:160:160; 14:650:351 moves to year 2 and 14:650:401 to year 3.
- New Brunswick public health: the 52-credit major for students applying from fall 2026 (adds 10:832:338; foundation courses
  from Degree Navigator lists).
- New Brunswick ITI: 04:547:210 is now Designing Human-Centered Technology Solutions.
- Newark: biology adds 21:120:344 Human Anatomy to the functional-organism cluster; psychology adds 21:830:210 to the
  cognition/neuroscience area; economics requires 21:220:406. The RBS–Newark core drops 29:620:301 and adds either-or
  choices (29:522:334 or 29:010:319; 29:623:311 or 29:010:204).
- Camden: biology core adds recitations and splits B.A. and B.S.; psychology replaces the old areas with four area
  requirements; business prerequisites add 52:135:101, 203 and 204, and the core adds 52:620:369. Camden HRM now has
  course numbers.

 to confirm with their adviser and the official page.

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
  open, that every course has a title, that links are https, and that every entry has a `checked` date.
- When a new catalog year is published, re-check every entry against it, update `catalog`, `edition`, `pageUrl` and
  `checked`, and note what changed above.
- Bump `data/version.json` on any change.
