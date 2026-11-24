import { SectionHead } from "../results/SectionHead.tsx";

const LOOK_FOR: { title: string; text: string }[] = [
  { title: "Major courses", text: "Which major requirements are done, in progress, or still open. Check prerequisite chains: a course that unlocks the next one sets your pace." },
  { title: "General education", text: "The requirements outside your major. They are easy to put off, and then they crowd your last year." },
  { title: "Credits by year", text: "Your total credits against what your degree needs. Most bachelor's degrees need about 120, so about 30 a year keeps a four-year pace." },
];

/**
 * Check your degree audit (Phase 6.2): the Courses tab when there is no course list for the student's school and major
 * (every school outside Rutgers). What an audit is, the three things to look for, and how to find their catalog. Static
 * text: nothing is linked, because the right pages are on the student's own school's site.
 */
export function DegreeAudit() {
  return (
    <section aria-labelledby="audit-h">
      <SectionHead id="audit-h" title="Check your degree audit" />
      <p className="mt-4 max-w-[44em]">
        A degree audit is a report your school makes from your transcript. It lists every requirement for your degree and
        shows which ones your courses already meet. Most schools let you run one yourself in the student portal: search
        for your school's name and "degree audit".
      </p>
      <h3 className="mt-6 text-[1.375rem]">Three things to look for</h3>
      <ol className="mt-2 border-t-[1.5px] border-blue">
        {LOOK_FOR.map((x, i) => (
          <li key={x.title} className="grid grid-cols-[1.5rem_1fr] gap-2 border-b-[1.5px] border-blue py-3">
            <span aria-hidden="true" className="fact text-blue">{i + 1}</span>
            <span><span className="label block">{x.title}</span>{x.text}</span>
          </li>
        ))}
      </ol>
      <h3 className="mt-6 text-[1.375rem]">Find your catalog</h3>
      <p className="mt-2 max-w-[44em]">
        You follow the catalog for the year you started. Search for your school's name and "undergraduate catalog", then
        pick that year. Take anything that looks wrong or unclear to your academic advisor.
      </p>
    </section>
  );
}
