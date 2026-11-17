# What recruiters look for, per career path

Data 2026.11.17-1. Each career path in `data/tracks.json` ranks its goals by weight (`boosts`, 0–1), and its must-dos (`gates`) are never dropped. Those weights decide what appears near the top of each semester. This file records the evidence behind them. Each track also carries a one-sentence `recruiterFocus` and its `recruiterSources`, and `test/recruiter.test.ts` pins the orderings below.

Change a weight only with a source, and add the source here.

## Across all fields

- NACE Job Outlook 2025: when two candidates are otherwise equal, employers rank internship experience (especially at their own organisation) as the top tiebreaker. Fewer than 40% of employers now screen by GPA. Source: [NACE](https://naceweb.org/job-market/trends-and-predictions/hiring-projections-level-off-for-the-college-class-of-2025). This is why most job-bound paths weight `ap-internship-target` at or near 1.

## Changes made in 2026.11.17-1

| Path | Change | Why |
|---|---|---|
| Data analytics | Must-dos are now only SQL (Python was also a must-do). Python 0.95 → 0.8; Excel 0.85 → 0.9 | Analyses of entry-level analyst postings put SQL and Excel first and a visualisation tool next; Python shows up as a differentiator rather than a requirement. [Dataquest](https://www.dataquest.io/blog/10-data-analysis-tools-for-entry-level-analysts), [posting analysis](https://dev.to/gnana_6392e836fd500a957dc/data-analyst-skills-companies-want-in-2026-2500-posting-analysis-2518) |
| Corporate finance | Excel modelling 0.75 → 0.85 | FP&A leaders ask entry-level candidates to show modelling. [AFP](https://www.financialprofessionals.org/training-resources/resources/articles/Details/how-to-stand-out-for-entry-level-fp-a-jobs-15-leaders-share-advice), [Robert Half](https://www.roberthalf.com/us/en/insights/career-development/how-to-become-a-financial-analyst) |
| Mechanical design | Internship applications added at 0.95; co-op 0.75 → 0.85 | Engineering employers convert interns and co-ops into hires. [Georgia Tech](https://coe.gatech.edu/academics/work-experience-through-co-op-and-internships), [NACE](https://naceweb.org/job-market/trends-and-predictions/hiring-projections-level-off-for-the-college-class-of-2025) |
| Marketing | Portfolio site 0.75 → 0.6 | Marketing managers rank experience far above a portfolio. [MarketingProfs](https://www.marketingprofs.com/charts/2016/29540/what-marketers-look-for-in-entry-level-candidates), [Recruiting News Network](https://www.recruitingnewsnetwork.com/posts/18-tips-for-employers-hiring-early-career-candidates-for-advertising-and-marketing-roles) |
| Pharmacist | Student-organisation leadership 0.7 → 0.85 | Residency directors weigh formal leadership roles. [PMC4336015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4336015), [PMC7405295](https://pmc.ncbi.nlm.nih.gov/articles/PMC7405295) |
| Clinical mental health | Research assistant 0.85 → 0.95 (now the top item); letters 0.85 → 0.9 | Clinical psychology programs rank research experience first, then letters from research mentors. [USF](https://www.usf.edu/arts-sciences/departments/psychology/graduate/clinical/prospective-graduate-students/index.aspx), [Case Western](https://psychsciences.case.edu/?p=4711) |
| Federal law enforcement | GPA floor 0.7 → 0.85 | The FBI Honors Internship requires a 3.0 GPA. [USAJOBS](https://www.usajobs.gov/job/857040400), [FBI Jobs](https://fbijobs.gov) |
| Public health | Professional writing 0.65 → 0.8 | Communication appears in about 92% of entry-level public health ads. [Frontiers in Public Health 2023](https://frontiersin.org/journals/public-health/articles/10.3389/fpubh.2023.1218509/pdf) |
| Social work | Volunteering 0.85 → 0.9 | MSW programs weigh related human-service experience heavily. [UC Berkeley](https://socialwelfare.berkeley.edu/node/62), [UW](https://socialwork.uw.edu/admissions/apply-to-msw/msw-admissions-faq/) |
| Pharma industry | Lab techniques 0.65 → 0.8 | Hands-on lab skills are the baseline for bachelor's hires. [BioSpace](https://www.biospace.com/no-ph-d-no-problem-life-science-industry-welcomes-candidates-with-only-a-bachelor-s-degree), [MIT CAPD](https://capd.mit.edu/resources/career-profile-biotechnology-pharmaceuticals-medical-devices/) |

## Paths checked and left as they were

The existing weights already matched the evidence for these paths. The sources are in each track's `recruiterSources`.

- **Software engineering:** internships, then projects and data structures. [Dartmouth](https://careerdesign.dartmouth.edu/blog/2023/07/26/what-are-software-engineering-recruiters-looking-for-on-applications/), [Dice](https://www.dice.com/career-advice/your-first-resume-and-portfolio-what-tech-hiring-managers-really-want-to-see)
- **Cybersecurity:** hands-on practice, plus Security+. [CAE Community](https://www.caecommunity.org/_files/ugd/fd9f4b_19a1b71b81a74c70a7bd59ff24b8361f.pdf)
- **UX design:** the portfolio. [NN/g](https://nngroup.com/articles/ux-design-portfolios/)
- **Investment banking:** internships, networking, technicals and early programs. [UNC Kenan-Flagler](https://www.kenan-flagler.unc.edu/news/conquering-investment-banking-recruiting/), [M&I](https://mergersandinquisitions.com/investment-banking-summer-internship-recruiting/)
- **Law school:** the LSAT and GPA. [Princeton Review](https://www.princetonreview.com/law-school-advice/gpa-for-law-school)
- **Medicine:** the MCAT, clinical experience and shadowing. [AAMC](https://www.aamc.org/media/23336/download)
- **PA and PT:** patient-care and observation hours. [The PA Life](https://www.thepalife.com/patient-contact-hours/)
- **Nursing:** the NCLEX, an externship and BLS. [American Nurse](https://www.myamericannurse.com/?p=24295)
- **Accounting:** internships, leadership programs and the CPA path. [Creighton](https://www.creighton.edu/student-success/careercenter/explore-career-paths/accounting-careers)
- **Consulting:** case interviews, leadership and networking. [Management Consulted](https://managementconsulted.com/land-an-offer-at-mckinsey-bain-bcg-or-deloitte/)
- **Supply chain:** internships or co-ops, Excel and Lean. [CourseCareers](https://coursecareers.com/blog-posts/what-employers-look-for-when-hiring-entry-level-supply-chain-coordinators)
- **Human resources:** an internship, systems and Excel, and the aPHR. [AIHR](https://www.aihr.com/hr-career-map/hr-coordinator/)
- **PR and media:** writing samples and student media. [5W PR](https://www.5wpr.com/new/pr-entry-level-job-guide/)
- **Government and policy:** internships and writing; federal roles through Pathways. [OPM](https://www.opm.gov/policy-data-oversight/hiring-information/students-recent-graduates/)
- **Research PhD:** research experience and letters. [Hall et al. 2017](https://gs.ucdenver.edu/fobgapt2/workshops/General/Hall_et_al_2017.pdf)
- **Medical devices and biotech:** internships or co-ops and lab or design work. [MIT CAPD](https://capd.mit.edu/resources/career-profile-biotechnology-pharmaceuticals-medical-devices/)
- **Packaging:** co-op preferred, plus CAD. [UW-Stout](https://www.uwstout.edu/node/8081)
- **Exploring:** exploration that leads to a first internship (NACE above).
