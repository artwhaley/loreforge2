"use client";
import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { ManagementPageModelAdapter as ManagementPageModel } from "./adapters";
import { ActionMenu } from "./controls";
import s from "./obsidian.module.css";

export function ObsidianManagement({
  model,
  onAction,
}: {
  model: ManagementPageModel;
  onAction: (label: string) => void;
}) {
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () =>
      model.rows.filter((row) =>
        `${row.primary} ${row.secondary}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [model.rows, query],
  );
  return (
    <div className={s.workspacePage}>
      <header className={s.pageHeading}>
        <div>
          <p className={s.eyebrow}>{model.eyebrow}</p>
          <h1>{model.title}</h1>
          <p>{model.description}</p>
        </div>
        <button className={s.primaryButton} onClick={() => onAction(model.createLabel)}>
          <Plus size={17} /> {model.createLabel}
        </button>
      </header>
      <section className={s.managementSurface} aria-label={`${model.title} management`}>
        <div className={s.managementToolbar}>
          <label className={s.search}>
            <Search size={18} />
            <span className={s.srOnly}>Search {model.title.toLowerCase()}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={model.searchPlaceholder}
            />
          </label>
          <button className={s.secondaryButton} onClick={() => onAction("Filter controls")}>
            <SlidersHorizontal size={15} /> Filters
          </button>
        </div>
        <div className={s.managementTable}>
          <div className={s.managementHead}>
            {model.columns.map((column) => (
              <span key={column}>{column}</span>
            ))}
            <span className={s.srOnly}>Actions</span>
          </div>
          {rows.map((row) => (
            <div className={s.managementRow} key={row.id}>
              <strong>{row.primary}</strong>
              <span>{row.secondary}</span>
              <span className={row.status ? s.managementStatus : ""}>{row.status ?? row.updatedLabel}</span>
              <ActionMenu
                label={`Actions for ${row.primary}`}
                trigger={<MoreHorizontal size={18} />}
                onAction={(action) => onAction(`${action.label}: ${row.primary}`)}
                items={[
                  { key: "edit", label: "Edit" },
                  { key: "archive", label: "Archive", danger: true },
                ]}
              />
            </div>
          ))}
        </div>
        {rows.length === 0 && <p className={s.managementEmpty}>{model.emptyLabel}</p>}
      </section>
    </div>
  );
}
