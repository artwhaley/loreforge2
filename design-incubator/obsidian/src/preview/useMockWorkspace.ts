import { useState } from "react";
import type { RecordsPageModel } from "../contracts/records";
import type { RecordsViewState } from "../ObsidianRecords";
import { recordActions } from "./fixtures";

/** TEMPORARY: in-memory fixture browsing only. Replace with a core-hook adapter.
 * No debounce, network, auth, lifecycle transitions, mutation or cursor engine. */
export function useMockWorkspace(
  model: RecordsPageModel,
  onAction: RecordsViewState["onAction"],
): RecordsViewState {
  const [search, setSearchValue] = useState(""),
    [selectedFolder, setSelectedFolder] = useState<number | null>(null),
    [type, setTypeValue] = useState("all"),
    [includeSubfolders, setInclude] = useState(true),
    [limit, setLimit] = useState(6),
    [expandedFolders, setExpanded] = useState<Set<number>>(new Set([1]));
  const records = model.records.filter(
    (record) =>
      (!search || record.title.toLowerCase().includes(search.toLowerCase())) &&
      (selectedFolder === null ||
        record.folderId === selectedFolder ||
        (includeSubfolders && selectedFolder === 1 && record.folderId === 5)) &&
      (type === "all" || record.documentTypeId === Number(type)),
  );
  return {
    search,
    setSearch(value) {
      setSearchValue(value);
      setLimit(6);
    },
    selectedFolder,
    selectFolder(id) {
      setSelectedFolder(id);
      setLimit(6);
    },
    type,
    setType(value) {
      setTypeValue(value);
      setLimit(6);
    },
    includeSubfolders,
    setIncludeSubfolders(value) {
      setInclude(value);
      setLimit(6);
    },
    expandedFolders,
    toggleFolder(id) {
      setExpanded((old) => {
        const next = new Set(old);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    records: records.slice(0, limit),
    resultCount: records.length,
    hasMore: records.length > limit,
    loadMore() {
      setLimit((value) => value + 6);
    },
    actions: recordActions,
    folderActions: [
      { key: "create-folder", label: "Create folder" },
      {
        key: "create-subfolder",
        label: "Create subfolder",
        disabled: selectedFolder === null,
      },
      {
        key: "rename-folder",
        label: "Rename folder",
        disabled: selectedFolder === null,
      },
      {
        key: "delete-folder",
        label: "Delete folder",
        disabled: selectedFolder === null,
        danger: true,
      },
    ],
    onAction,
  };
}
