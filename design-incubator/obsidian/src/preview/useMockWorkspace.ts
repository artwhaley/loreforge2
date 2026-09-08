import { useState } from "react";
import type { RecordsPageModel } from "../contracts/records";
import type { RecordsViewState } from "../ObsidianRecords";
import { recordActions } from "./fixtures";
import type { ObsidianConfig } from "../config";

/** TEMPORARY: in-memory fixture browsing only. Replace with a core-hook adapter.
 * No debounce, network, auth, lifecycle transitions, mutation or cursor engine. */
export function useMockWorkspace(
  model: RecordsPageModel,
  onAction: RecordsViewState["onAction"],
  defaults: ObsidianConfig["records"],
): RecordsViewState {
  const [search, setSearchValue] = useState(""),
    [selectedFolder, setSelectedFolder] = useState<number | null>(null),
    [type, setTypeValue] = useState("all"),
    [includeSubfolders, setInclude] = useState(true),
    [view, setViewValue] = useState<"cards" | "list">(defaults.defaultView),
    [sort, setSortValue] = useState<RecordsViewState["sort"]>("newest"),
    [pageSize, setPageSizeValue] = useState<number>(
      defaults.defaultView === "cards"
        ? defaults.cardPageSize
        : defaults.listPageSize,
    ),
    [page, setPageValue] = useState(1),
    [expandedFolders, setExpanded] = useState<Set<number>>(new Set([1]));
  const records = model.records
    .filter(
      (record) =>
        (!search || record.title.toLowerCase().includes(search.toLowerCase())) &&
        (selectedFolder === null ||
          record.folderId === selectedFolder ||
          (includeSubfolders &&
            selectedFolder === 1 &&
            record.folderId === 5)) &&
        (type === "all" || record.documentTypeId === Number(type)),
    )
    .sort((left, right) => {
      if (sort === "title-asc" || sort === "title-desc") {
        const result = left.title.localeCompare(right.title);
        return sort === "title-asc" ? result : -result;
      }
      const result =
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      return sort === "newest" ? result : -result;
    });
  return {
    search,
    setSearch(value) {
      setSearchValue(value);
      setPageValue(1);
    },
    selectedFolder,
    selectFolder(id) {
      setSelectedFolder(id);
      setPageValue(1);
    },
    type,
    setType(value) {
      setTypeValue(value);
      setPageValue(1);
    },
    view,
    setView(value) {
      setViewValue(value);
      const nextSize =
        value === "cards" ? defaults.cardPageSize : defaults.listPageSize;
      setPageSizeValue(nextSize);
      setPageValue(1);
    },
    sort,
    setSort(value) {
      setSortValue(value);
      setPageValue(1);
    },
    pageSize,
    setPageSize(value) {
      setPageSizeValue(value);
      setPageValue(1);
    },
    includeSubfolders,
    setIncludeSubfolders(value) {
      setInclude(value);
      setPageValue(1);
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
    page,
    pageCount: Math.max(1, Math.ceil(records.length / pageSize)),
    setPage(value) {
      setPageValue(
        Math.max(1, Math.min(value, Math.max(1, Math.ceil(records.length / pageSize)))),
      );
    },
    records: records.slice((page - 1) * pageSize, page * pageSize),
    resultCount: records.length,
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
