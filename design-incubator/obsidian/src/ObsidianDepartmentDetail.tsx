"use client";
import { useMemo, useState } from "react";
import {
  ConnectorModel,
  DataBinding,
  DiagramComponent,
  HierarchicalTree,
  Inject,
  NodeModel,
} from "@syncfusion/ej2-react-diagrams";
import { DataManager } from "@syncfusion/ej2-data";
import { ArrowLeft, ArrowUpRight, ContactRound, Info, UsersRound } from "lucide-react";
import type { DepartmentSummary } from "./contracts/departments";
import s from "./obsidian.module.css";

export type OrgChartMember = {
  id: string;
  parentId: string | null;
  name: string;
  role: string;
  detail: string;
};

export type DepartmentDetailModel = {
  department: DepartmentSummary;
  members: OrgChartMember[];
};

function DepartmentChart({
  department,
  onPersonSelect,
}: {
  department: DepartmentDetailModel;
  onPersonSelect: (person: OrgChartMember) => void;
}) {
  const data = useMemo(() => new DataManager(department.members), [department.members]);
  return (
    <DiagramComponent
      id={`department-chart-${department.department.id}`}
      className={s.syncfusionChart}
      width="100%"
      height="510px"
      backgroundColor="transparent"
      snapSettings={{ constraints: 0 }}
      layout={{ type: "OrganizationalChart", horizontalSpacing: 34, verticalSpacing: 54 }}
      dataSourceSettings={{ id: "id", parentId: "parentId", dataSource: data }}
      getNodeDefaults={(node: NodeModel) => {
        const person = node.data as OrgChartMember;
        node.width = 182;
        node.height = 67;
        node.shape = { type: "Basic", shape: "Rectangle", cornerRadius: 9 };
        node.style = { fill: "#182a30", strokeColor: "#91b1aa", strokeWidth: 1 };
        node.annotations = [
          {
            content: `${person.name}\n${person.role}`,
            style: { color: "#e4efeb", fontSize: 12, fontFamily: "Manrope Variable" },
          },
        ];
        return node;
      }}
      getConnectorDefaults={(connector: ConnectorModel) => {
        connector.type = "Orthogonal";
        connector.style = { strokeColor: "#7ca79c", strokeWidth: 1 };
        connector.targetDecorator = { shape: "None" };
        return connector;
      }}
      click={(args) => {
        const selector = args.element;
        const nodeId = "nodes" in selector ? selector.nodes?.[0]?.id : undefined;
        const person = department.members.find((member) => member.id === nodeId);
        if (person) onPersonSelect(person);
      }}
    >
      <Inject services={[DataBinding, HierarchicalTree]} />
    </DiagramComponent>
  );
}

export function ObsidianDepartmentDetail({
  baseUrl,
  departments,
  selectedSlug,
  details,
}: {
  baseUrl: string;
  departments: DepartmentSummary[];
  selectedSlug: string;
  details: Record<string, DepartmentDetailModel>;
}) {
  const department = details[selectedSlug] ?? details[departments[0]?.slug];
  const [person, setPerson] = useState<OrgChartMember | null>(null);
  if (!department) return null;
  return (
    <div className={s.publicPage}>
      <a href={`${baseUrl}/departments`} className={s.backLink}>
        <ArrowLeft size={15} /> All departments
      </a>
      <div className={s.departmentTabs} role="tablist" aria-label="Department charts">
        {departments.map((item) => (
          <a
            key={item.slug}
            href={`${baseUrl}/departments/${item.slug}`}
            role="tab"
            aria-selected={item.slug === department.department.slug}
          >
            {item.name}
          </a>
        ))}
      </div>
      <section className={s.departmentDetailHeading}>
        <div>
          <p className={s.eyebrow}>DEPARTMENT DIRECTORY</p>
          <h1>{department.department.name}</h1>
          <p>{department.department.description}</p>
        </div>
        <span><UsersRound size={16} /> {department.members.length} people</span>
      </section>
      <section className={s.orgChartPanel} aria-label={`${department.department.name} organization chart`}>
        <div className={s.orgChartHeading}>
          <div>
            <p className={s.eyebrow}>AT A GLANCE</p>
            <h2>Organization chart</h2>
          </div>
          <span><Info size={15} /> Select a person for their role details</span>
        </div>
        <DepartmentChart department={department} onPersonSelect={setPerson} />
      </section>
      {person && (
        <aside className={s.personDetail} aria-live="polite">
          <ContactRound size={18} />
          <div><strong>{person.name}</strong><span>{person.role} · {person.detail}</span></div>
          <a href="#contact">View profile <ArrowUpRight size={14} /></a>
        </aside>
      )}
    </div>
  );
}
