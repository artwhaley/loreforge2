type Lifecycle = string; // Incubation snapshot; lifecycle semantics remain in core.

/** A semantic destination link. `href` is the fully-resolved Domain URL. */
export type NavigationItem = {
  label: string;
  segment: string;
  href: string;
};

export type HomeRecordSummary = {
  id: number | string;
  title: string;
  type: string;
  activity: string;
};

export type RecordSummary = {
  id: number;
  title: string;
  folderId: number | null;
  documentTypeId: number | null;
  updatedAt: string;
  preparedBy: string | null;
  lifecycle: Lifecycle | string;
  locked: boolean;
  capabilities: {
    read: boolean;
    edit: boolean;
    supersede: boolean;
    delete: boolean;
  };
};

export type FolderSummary = {
  id: number;
  name: string;
  systemManaged: boolean;
  readableRecordCount: number;
  children: FolderSummary[];
};

export type DocumentTypeSummary = {
  id: number;
  name: string;
};

export type SupersessionEdge = {
  newerId: number;
  olderId: number;
};

export type RecordsCapabilities = {
  manageFolders: boolean;
  actOnRecords: boolean;
  deleteRecords: boolean;
};

export type RecordsVocabulary = {
  documentSingular: string;
  documentPlural: string;
  folderPlural: string;
};
