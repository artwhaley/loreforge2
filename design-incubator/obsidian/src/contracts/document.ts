type Lifecycle = string; // Incubation snapshot; lifecycle semantics remain in core.

/**
 * Semantic Document reading model. Holds only safe, authorized data needed to
 * present one Document. Links to related records are pre-authorized titles (or
 * absent entirely when unreadable); no raw relationship rows cross the seam.
 *
 * Fields intentionally described as "inputs/output": the builder resolves the
 * title/meta/etc., and the Design decides final composition.
 */
export type DocumentPageModel = {
  baseUrl: string;
  domainSlug: string;
  recordId: number;

  title: string;
  /** Rendered canonical Markdown body (safe HTML). */
  bodyHtml: string;
  /** Raw canonical Markdown, only when the viewer should see source. */
  bodySource: string | null;

  meta: Array<{ label: string; value: string }>;

  lifecycle: Lifecycle | string;
  locked: boolean;
  isSuperseded: boolean;

  supersession: {
    supersededBy: {
      id: number;
      title: string;
      createdLabel: string;
      preparedByLabel: string;
    } | null;
    supersedes: { id: number; title: string } | null;
  };

  concerns: Array<{ name: string; relationshipLabel?: string }>;
  tags: string[];

  preparedByLabel: string;

  capabilities: {
    edit: boolean;
    submit: boolean;
    file: boolean;
    approve: boolean;
    restore: boolean;
    deprecate: boolean;
    lock: boolean;
    unlock: boolean;
    delete: boolean;
    supersede: boolean;
  };

  routes: {
    editUrl: string | null;
    historyUrl: string | null;
    supersedeUrl: string | null;
  };

  statusMessage: { code: string; text: string } | null;
};
