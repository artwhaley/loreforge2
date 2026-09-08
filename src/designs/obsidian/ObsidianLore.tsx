"use client";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Search, X } from "lucide-react";
import type { LoreEntryAdapter, LorePageModelAdapter } from "./adapters";
import s from "./obsidian.module.css";

function LoreIndex({
  model,
  activeSlug,
}: {
  model: LorePageModelAdapter;
  activeSlug?: string;
}) {
  const [query, setQuery] = useState("");
  const entries = useMemo(
    () =>
      model.entries.filter((entry) =>
        `${entry.title} ${entry.group ?? ""} ${entry.summary ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [model.entries, query],
  );
  const groups = [...new Set(entries.map((entry) => entry.group || "Lore"))];
  return (
    <aside className={s.loreIndex} aria-label="Lore index">
      <div className={s.loreIndexHeading}>
        <BookOpen size={17} />
        <span>THE LORE OF ASTER REACH</span>
      </div>
      <label className={s.loreSearch}>
        <Search size={15} />
        <span className={s.srOnly}>Search lore</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the lore"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear lore search">
            <X size={14} />
          </button>
        )}
      </label>
      <nav className={s.loreNav}>
        <a
          href={`${model.baseUrl}/lore`}
          aria-current={activeSlug ? undefined : "page"}
        >
          <span>Overview</span>
          <small>{model.entries.length}</small>
        </a>
        {groups.map((group) => (
          <div key={group} className={s.loreGroup}>
            <p>{group}</p>
            {entries
              .filter((entry) => (entry.group || "Lore") === group)
              .map((entry) => (
                <a
                  key={entry.slug}
                  href={`${model.baseUrl}/lore/${entry.slug}`}
                  aria-current={activeSlug === entry.slug ? "page" : undefined}
                >
                  {entry.title}
                </a>
              ))}
          </div>
        ))}
      </nav>
      {entries.length === 0 && <p className={s.loreEmpty}>No lore matches that search.</p>}
    </aside>
  );
}

export function ObsidianLore({
  model,
  entry,
}: {
  model: LorePageModelAdapter;
  entry?: LoreEntryAdapter;
}) {
  return (
    <div className={s.lorePage}>
      <LoreIndex model={model} activeSlug={entry?.slug} />
      {entry ? <LoreArticle entry={entry} /> : <LoreOverview model={model} />}
    </div>
  );
}

function LoreOverview({ model }: { model: LorePageModelAdapter }) {
  const groups = [...new Set(model.entries.map((entry) => entry.group || "Lore"))];
  return (
    <section className={s.loreOverview}>
      <p className={s.eyebrow}>WORLD GUIDE</p>
      <h1>
        The lore of
        <br />
        <em>Aster Reach.</em>
      </h1>
      <p className={s.loreIntroduction}>{model.introduction}</p>
      <div className={s.loreShelf}>
        {groups.map((group, index) => {
          const entries = model.entries.filter((entry) => (entry.group || "Lore") === group);
          return (
            <section key={group}>
              <div className={s.shelfHeading}>
                <span>0{index + 1}</span>
                <h2>{group}</h2>
                <small>{entries.length} entries</small>
              </div>
              <div className={s.loreCards}>
                {entries.map((entry) => (
                  <a key={entry.slug} href={`${model.baseUrl}/lore/${entry.slug}`}>
                    {entry.updatedLabel ? <span>{entry.updatedLabel}</span> : null}
                    <h3>{entry.title}</h3>
                    {entry.summary ? <p>{entry.summary}</p> : null}
                    <ArrowRight size={17} />
                  </a>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function LoreArticle({ entry }: { entry: LoreEntryAdapter }) {
  return (
    <article className={s.loreArticle}>
      <p className={s.eyebrow}>{entry.group || "Lore"}</p>
      <h1>{entry.title}</h1>
      {entry.updatedLabel ? <p className={s.loreArticleMeta}>Last revised {entry.updatedLabel}</p> : null}
      <div dangerouslySetInnerHTML={{ __html: entry.bodyHtml }} />
    </article>
  );
}
