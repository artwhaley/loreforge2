import { ArrowUpRight, Building2, UsersRound } from "lucide-react";
import type { DepartmentSummary, DepartmentsPageModel } from "@/lib/page-models/departments";
import s from "./obsidian.module.css";

export function ObsidianDepartments({
  model,
}: {
  model: DepartmentsPageModel;
}) {
  return (
    <div className={s.publicPage}>
      <section className={s.directoryHeading}>
        <p className={s.eyebrow}>THE PEOPLE WHO KEEP THINGS GOING</p>
        <h1>
          Offices of
          <br />
          <em>{model.domainName}.</em>
        </h1>
        <p>
          These are the working groups, civic offices, and crews that make the
          Reach more than a place on a map.
        </p>
        <span className={s.srOnly}>{model.vocabulary.subdomainPlural}</span>
      </section>
      <section className={s.departmentGrid} aria-label="Departments">
        {model.departments.length === 0 ? <p className={s.managementEmpty}>No {model.vocabulary.subdomainPlural.toLowerCase()} have been configured.</p> : model.departments.map((department) => (
          <DepartmentCard key={department.id} department={department} baseUrl={model.baseUrl} domainName={model.domainName} />
        ))}
      </section>
      {model.manageHref && (
        <a href={model.manageHref} className={s.quietLink}>
          Manage departments <ArrowUpRight size={14} />
        </a>
      )}
    </div>
  );
}

function DepartmentCard({
  department,
  baseUrl,
  domainName,
}: {
  department: DepartmentSummary;
  baseUrl: string;
  domainName: string;
}) {
  return (
    <a className={s.departmentCard} href={`${baseUrl}/departments/${department.slug}`}>
      <span className={s.departmentIcon}>
        <Building2 size={23} strokeWidth={1.2} />
      </span>
      <span className={s.departmentCardTop}>
        <span>{department.memberCount} members</span>
        <ArrowUpRight size={18} />
      </span>
      <strong>{department.name}</strong>
      <p>{department.description ?? `A working group of ${domainName}.`}</p>
      <span className={s.departmentFoot}>
        <UsersRound size={14} /> View the office
      </span>
    </a>
  );
}
