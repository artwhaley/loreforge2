"use client";
import { useMemo } from "react";
import {
  AnnotationConstraints,
  ConnectorModel,
  DataBinding,
  DiagramConstraints,
  DiagramComponent,
  HierarchicalTree,
  Inject,
  NodeConstraints,
  NodeModel,
} from "@syncfusion/ej2-react-diagrams";
import { DataManager } from "@syncfusion/ej2-data";
import { ArrowLeft, Info, UsersRound } from "lucide-react";
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
  onPersonOpen,
}: {
  department: DepartmentDetailModel;
  onPersonOpen: (person: OrgChartMember) => void;
}) {
  const data = useMemo(() => new DataManager(department.members), [department.members]);
  return (
    <DiagramComponent
      id={`department-chart-${department.department.id}`}
      className={s.syncfusionChart}
      width="100%"
      height="510px"
      backgroundColor="#1b2b31"
      // Keep pan/zoom and pointer events useful while removing API edits from the canvas.
      constraints={DiagramConstraints.Default & ~DiagramConstraints.ApiUpdate}
      snapSettings={{ constraints: 0 }}
      layout={{ type: "OrganizationalChart", horizontalSpacing: 34, verticalSpacing: 54 }}
      dataSourceSettings={{ id: "id", parentId: "parentId", dataSource: data }}
      getNodeDefaults={(node: NodeModel) => {
        const person = node.data as OrgChartMember;
        node.width = 182;
        node.height = 67;
        node.shape = { type: "Basic", shape: "Rectangle", cornerRadius: 9 };
        node.constraints =
          (NodeConstraints.Default | NodeConstraints.ReadOnly) &
          ~(NodeConstraints.Drag |
            NodeConstraints.Rotate |
            NodeConstraints.Resize |
            NodeConstraints.Delete |
            NodeConstraints.AllowDrop);
        node.style = { fill: "#29434a", strokeColor: "#c3eedc", strokeWidth: 2 };
        node.annotations = [
          {
            content: `${person.name}\n${person.role}`,
            constraints: AnnotationConstraints.InheritReadOnly,
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
        if (person) onPersonOpen(person);
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
  onPersonOpen,
}: {
  baseUrl: string;
  departments: DepartmentSummary[];
  selectedSlug: string;
  details: Record<string, DepartmentDetailModel>;
  onPersonOpen: (person: OrgChartMember) => void;
}) {
  const department = details[selectedSlug] ?? details[departments[0]?.slug];
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
          <span><Info size={15} /> Select a person to open their profile</span>
        </div>
        <DepartmentChart department={department} onPersonOpen={onPersonOpen} />
      </section>
    </div>
  );
}
