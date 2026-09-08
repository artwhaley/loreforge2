import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
import { ChevronDown, Check, ArrowUpRight } from "lucide-react";
import "@fontsource-variable/manrope";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "./reset.css";
import s from "../obsidian.module.css";
import { ObsidianShell } from "../ObsidianShell";
import { ObsidianHome } from "../ObsidianHome";
import { ObsidianRecords } from "../ObsidianRecords";
import { ObsidianDocument } from "../ObsidianDocument";
import { DocumentActions } from "../DocumentActions";
import { ActionMenu, Modal, type Action } from "../controls";
import { OBSIDIAN_DEFAULTS } from "../config";
import {
  archive,
  base,
  document as documentFixture,
  documentActions,
  home,
  shell,
} from "./fixtures";
import { useMockWorkspace } from "./useMockWorkspace";

function App() {
  const [path, setPath] = useState(window.location.pathname),
    [dialog, setDialog] = useState<Action | null>(null),
    [notice, setNotice] = useState("");
  const reduced = useReducedMotion();
  const [fixture] = useState(() =>
    new URLSearchParams(window.location.search).get("fixture"),
  );
  const empty = fixture === "empty";
  const visitor = fixture === "visitor";
  function navigate(href: string) {
    const next = new URL(href, location.origin);
    if (fixture) next.searchParams.set("fixture", fixture);
    history.pushState({}, "", next.pathname + next.search);
    setPath(next.pathname);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function action(item: Action) {
    if (item.key === "view" && item.href) navigate(item.href);
    else setDialog(item);
  }
  const workspace = useMockWorkspace(
    empty
      ? { ...archive, records: [], totalReadableRecordCount: 0, folders: [] }
      : archive,
    action,
    OBSIDIAN_DEFAULTS.records,
  );
  useEffect(() => {
    document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  }, [path]);
  useEffect(() => {
    const pop = () => setPath(location.pathname);
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    function click(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as HTMLElement).closest("a");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const url = new URL(href, location.origin);
      if (url.origin !== location.origin) return;
      event.preventDefault();
      if (
        url.pathname === base ||
        url.pathname === `${base}/records` ||
        new RegExp(`^${base}/documents/\\d+$`).test(url.pathname)
      )
        navigate(href);
      else
        setDialog({
          key: "route",
          label: anchor.textContent?.trim() || "LoreForge",
          href,
        });
    }
    window.addEventListener("click", click);
    return () => window.removeEventListener("click", click);
  }, []);
  const isRecord = path === `${base}/records`,
    match = path.match(/\/documents\/(\d+)$/),
    record = match
      ? archive.records.find((r) => r.id === Number(match[1]))
      : null;
  const active = isRecord || match ? "records" : "";
  const currentDoc = record
    ? {
        ...documentFixture,
        recordId: record.id,
        title: record.title,
        lifecycle: record.lifecycle,
        locked: record.locked,
        preparedByLabel: record.preparedBy ?? "Unattributed",
        supersession:
          record.id === 7
            ? {
                supersedes: null,
                supersededBy: {
                  id: 1,
                  title: documentFixture.title,
                  createdLabel: "September 7, 2026",
                  preparedByLabel: "Elara Voss",
                },
              }
            : record.id === 1
              ? documentFixture.supersession
              : { supersedes: null, supersededBy: null },
      }
    : documentFixture;
  const shellModel = visitor
    ? {
        ...shell,
        managementNavigation: [],
        operatingContext: {
          ...shell.operatingContext,
          account: null,
          availableCharacters: [],
          activeCharacterId: null,
        },
      }
    : shell;
  const context = (
    <div className={s.operatingContext}>
      <span className={s.contextDomain}>
        Domain <b>{shell.domain.name}</b>
      </span>
      <span className={s.contextSeparator} />
      {visitor ? (
        <button onClick={() => setDialog({ key: "account", label: "Sign in" })}>
          Sign in <ArrowUpRight size={13} />
        </button>
      ) : (
        <ActionMenu
          label="Operating context"
          trigger={
            <>
              <span className={s.avatar}>EV</span>
              <span>
                Acting as <b>Elara Voss</b>
              </span>
              <ChevronDown size={12} />
            </>
          }
          items={[
            { key: "character", label: "Elara Voss · current character" },
            { key: "domain", label: "Aster Reach · current domain" },
            { key: "account", label: "Morgan · account" },
            { key: "dashboard", label: "LoreForge dashboard", href: "/" },
          ]}
          onAction={action}
        />
      )}
    </div>
  );
  return (
    <MotionConfig reducedMotion="user">
      <ObsidianShell
        model={shellModel}
        active={active}
        operatingContext={context}
      >
        <motion.div
          key={path}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {isRecord ? (
            <ObsidianRecords
              model={
                visitor
                  ? {
                      ...archive,
                      capabilities: {
                        manageFolders: false,
                        actOnRecords: false,
                        deleteRecords: false,
                      },
                    }
                  : empty
                    ? {
                        ...archive,
                        records: [],
                        folders: [],
                        totalReadableRecordCount: 0,
                      }
                    : archive
              }
              workspace={
                visitor
                  ? {
                      ...workspace,
                      actions: Object.fromEntries(
                        Object.entries(workspace.actions).map(([id, items]) => [
                          id,
                          items.filter((item) => item.key === "view"),
                        ]),
                      ),
                    }
                  : workspace
              }
            />
          ) : match ? (
            <ObsidianDocument
              model={currentDoc}
              actions={
                visitor ? null : (
                  <DocumentActions
                    items={(
                      documentActions[currentDoc.lifecycle] ??
                      documentActions.filed
                    ).map((item) =>
                      currentDoc.locked && item.key === "lock"
                        ? { key: "unlock", label: "Unlock" }
                        : item,
                    )}
                    onAction={action}
                  />
                )
              }
            />
          ) : (
            <ObsidianHome
              model={
                empty
                  ? {
                      ...home,
                      recentRecords: [],
                      welcome: { html: "", editHref: home.welcome.editHref },
                    }
                  : visitor
                    ? { ...home, welcome: { ...home.welcome, editHref: null } }
                    : home
              }
              atmosphereImage={OBSIDIAN_DEFAULTS.atmosphereImage}
              atmosphereCaption="THE ARCHIVE AT NORTHWATCH"
            />
          )}
        </motion.div>
      </ObsidianShell>
      <Modal
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={dialog?.label ?? ""}
        description={
          dialog?.danger
            ? "This is a preview of the confirmation step. No records or folders will be deleted."
            : "This action connects to LoreForge during integration. You are viewing the isolated Obsidian design preview."
        }
      >
        {dialog?.key.includes("folder") && !dialog.danger && (
          <label className={s.modalField}>
            Folder name
            <input placeholder="Collection name" />
          </label>
        )}
        {dialog?.key === "new" && (
          <label className={s.modalField}>
            Document title
            <input placeholder="Untitled document" />
          </label>
        )}
        <div className={s.dialogActions}>
          <button className={s.secondaryButton} onClick={() => setDialog(null)}>
            Close
          </button>
          {dialog?.danger && (
            <button
              className={s.dangerButton}
              onClick={() => {
                setDialog(null);
                setNotice(
                  "Confirmation previewed. Your records are unchanged.",
                );
              }}
            >
              Preview confirmation
            </button>
          )}
        </div>
      </Modal>
      {notice && (
        <div className={s.toast} role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
