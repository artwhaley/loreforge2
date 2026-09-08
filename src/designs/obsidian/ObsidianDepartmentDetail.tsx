"use client";

import { useMemo } from "react";
import { ArrowLeft, Info, UsersRound } from "lucide-react";
import type { DepartmentMember, DepartmentPageModel } from "@/lib/page-models/departments";
import s from "./obsidian.module.css";

type ChartPosition = {
  member: DepartmentMember;
  left: number;
  top: number;
};

type ChartLayout = {
  positions: ChartPosition[];
  parentById: Map<number, DepartmentMember>;
  height: number;
};

function buildChartLayout(members: DepartmentMember[]): ChartLayout {
  const firstByRole = new Map<number, DepartmentMember>();
  for (const member of members) {
    if (member.roleId != null && !firstByRole.has(member.roleId)) firstByRole.set(member.roleId, member);
  }

  const parentById = new Map<number, DepartmentMember>();
  const childrenById = new Map<number, DepartmentMember[]>();
  for (const member of members) {
    const parent = member.parentRoleId == null ? undefined : firstByRole.get(member.parentRoleId);
    if (!parent || parent.id === member.id) continue;
    parentById.set(member.id, parent);
    const children = childrenById.get(parent.id) ?? [];
    children.push(member);
    childrenById.set(parent.id, children);
  }

  const roots = members.filter((member) => !parentById.has(member.id));
  const widthCache = new Map<number, number>();
  const visiting = new Set<number>();
  const subtreeWidth = (member: DepartmentMember): number => {
    const cached = widthCache.get(member.id);
    if (cached != null) return cached;
    if (visiting.has(member.id)) return 1;
    visiting.add(member.id);
    const children = childrenById.get(member.id) ?? [];
    const width = children.length === 0 ? 1 : children.reduce((sum, child) => sum + subtreeWidth(child), 0);
    visiting.delete(member.id);
    widthCache.set(member.id, width);
    return width;
  };

  const totalWidth = Math.max(1, roots.reduce((sum, root) => sum + subtreeWidth(root), 0));
  const positions: ChartPosition[] = [];
  const positioned = new Set<number>();
  let maxDepth = 0;

  const place = (member: DepartmentMember, depth: number, start: number) => {
    if (positioned.has(member.id)) return;
    positioned.add(member.id);
    const width = subtreeWidth(member);
    positions.push({ member, left: ((start + width / 2) / totalWidth) * 100, top: 48 + depth * 110 });
    maxDepth = Math.max(maxDepth, depth);
    let childStart = start;
    for (const child of childrenById.get(member.id) ?? []) {
      place(child, depth + 1, childStart);
      childStart += subtreeWidth(child);
    }
  };

  let rootStart = 0;
  for (const root of roots) {
    place(root, 0, rootStart);
    rootStart += subtreeWidth(root);
  }

  // A malformed or incomplete relationship graph should still show every
  // member without inventing a parent edge.
  for (const member of members) {
    if (!positioned.has(member.id)) place(member, 0, rootStart++);
  }

  return {
    positions,
    parentById,
    height: Math.max(510, 48 + maxDepth * 110 + 67 + 48),
  };
}

function DepartmentChart({ model }: { model: DepartmentPageModel }) {
  const layout = useMemo(() => buildChartLayout(model.members), [model.members]);
  const positionById = new Map(layout.positions.map((position) => [position.member.id, position]));

  return (
    <div className={s.syncfusionChart} style={{ height: layout.height + 22 }}>
      <div className={s.orgChartCanvas} style={{ height: layout.height }}>
        <svg
          className={s.orgChartConnections}
          viewBox={`0 0 1000 ${layout.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {layout.positions.map(({ member }) => {
            const parent = layout.parentById.get(member.id);
            const childPosition = positionById.get(member.id);
            const parentPosition = parent ? positionById.get(parent.id) : undefined;
            if (!parentPosition || !childPosition) return null;
            const x1 = parentPosition.left * 10;
            const x2 = childPosition.left * 10;
            const y1 = parentPosition.top + 67;
            const y2 = childPosition.top;
            const mid = y1 + (y2 - y1) / 2;
            return <path key={`connector-${member.id}`} d={`M ${x1} ${y1} V ${mid} H ${x2} V ${y2}`} />;
          })}
        </svg>
        {layout.positions.map(({ member, left, top }) => {
          const content = (
            <>
              <span className={s.orgChartNodeName}>{member.name}</span>
              <span className={s.orgChartNodeRole}>{member.role ?? "Member"}</span>
            </>
          );
          const style = { left: `calc(${left}% - 91px)`, top };
          return member.characterId != null ? (
            <a
              key={member.id}
              className={s.orgChartNode}
              style={style}
              href={`${model.baseUrl}/characters/${member.characterId}`}
              aria-label={`${member.name}, ${member.role ?? "Member"}`}
            >
              {content}
            </a>
          ) : (
            <div key={member.id} className={s.orgChartNode} style={style}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ObsidianDepartmentDetail({ model }: { model: DepartmentPageModel }) {
  const departments = model.departments ?? [{
    id: 0,
    name: model.name,
    slug: model.slug ?? "",
    description: model.description,
    memberCount: model.members.length,
  }];

  return (
    <div className={s.publicPage}>
      <a href={`${model.baseUrl}/departments`} className={s.backLink}>
        <ArrowLeft size={15} /> All departments
      </a>
      <div className={s.departmentTabs} role="tablist" aria-label="Department charts">
        {departments.map((item) => (
          <a
            key={item.slug}
            href={`${model.baseUrl}/departments/${item.slug}`}
            role="tab"
            aria-selected={item.slug === model.slug}
          >
            {item.name}
          </a>
        ))}
      </div>
      <section className={s.departmentDetailHeading}>
        <div>
          <p className={s.eyebrow}>DEPARTMENT DIRECTORY</p>
          <h1>{model.name}</h1>
          <p>{model.description}</p>
        </div>
        <span><UsersRound size={16} /> {model.members.length} people</span>
      </section>
      {model.manageHref ? <a className={s.srOnly} href={model.manageHref}>Manage people</a> : null}
      <section className={s.orgChartPanel} aria-label={`${model.name} organization chart`}>
        <div className={s.orgChartHeading}>
          <div>
            <p className={s.eyebrow}>AT A GLANCE</p>
            <h2>Organization chart</h2>
          </div>
          <span><Info size={15} /> Select a person to open their profile</span>
        </div>
        {model.members.length === 0 ? (
          <p className={s.managementEmpty}>No active {model.vocabulary.memberPlural.toLowerCase()} yet.</p>
        ) : (
          <DepartmentChart model={model} />
        )}
        {model.folderNames.length > 0 ? (
          <span className={s.srOnly}>
            {model.vocabulary.folderPlural}: {model.folderNames.join(", ")}
          </span>
        ) : null}
      </section>
    </div>
  );
}
