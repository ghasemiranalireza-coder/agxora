import type {
  DocumentFileType,
  DocumentIntegration,
  LibraryView,
  LinkedModuleKey,
  SecurityControl,
  ShareScope,
} from "./types";

export const DOCUMENT_FILE_TYPES: readonly DocumentFileType[] = [
  "pdf",
  "word",
  "excel",
  "powerpoint",
  "image",
  "video",
  "audio",
  "markdown",
  "text",
  "json",
  "csv",
  "other",
] as const;

export const LIBRARY_VIEWS: readonly {
  readonly id: LibraryView;
  readonly label: string;
}[] = [
  { id: "all", label: "All Documents" },
  { id: "recent", label: "Recent" },
  { id: "favorites", label: "Favorites" },
  { id: "shared", label: "Shared" },
  { id: "archived", label: "Archived" },
  { id: "trash", label: "Trash" },
  { id: "knowledge", label: "Knowledge Base" },
] as const;

export const LINKED_MODULE_OPTIONS: readonly LinkedModuleKey[] = [
  "crm",
  "finance",
  "automation",
  "creator",
  "hr",
  "projects",
] as const;

export const SHARE_SCOPES: readonly ShareScope[] = [
  "private",
  "organization",
  "department",
  "specific_users",
  "public_link",
] as const;

export const DOCUMENT_INTEGRATIONS: readonly DocumentIntegration[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    adapter: "GoogleDriveAdapter",
    status: "beta",
    description: "Import / sync architecture reserved — no live OAuth yet.",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    adapter: "OneDriveAdapter",
    status: "planned",
    description: "Microsoft Graph file hooks reserved.",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    adapter: "DropboxAdapter",
    status: "planned",
    description: "Dropbox API adapter reserved.",
  },
  {
    id: "box",
    name: "Box",
    adapter: "BoxAdapter",
    status: "coming_soon",
    description: "Enterprise Box connector reserved.",
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    adapter: "SharePointAdapter",
    status: "planned",
    description: "Site libraries + metadata mapping reserved.",
  },
  {
    id: "nextcloud",
    name: "Nextcloud",
    adapter: "NextcloudAdapter",
    status: "disabled",
    description: "WebDAV adapter reserved — disabled until self-host plan.",
  },
] as const;

export const SECURITY_CONTROLS: readonly SecurityControl[] = [
  {
    id: "rbac",
    title: "Role Based Access",
    description: "Owner, editor, viewer, and approver roles map to document ACLs.",
    status: "enabled",
  },
  {
    id: "permissions",
    title: "Permission Architecture",
    description: "Folder inheritance with document-level overrides — future API ready.",
    status: "enabled",
  },
  {
    id: "audit",
    title: "Audit Trail",
    description: "Immutable activity events for views, shares, restores, and approvals.",
    status: "enabled",
  },
  {
    id: "encryption",
    title: "Encryption",
    description: "At-rest and in-transit encryption hooks reserved for KMS wiring.",
    status: "placeholder",
  },
  {
    id: "retention",
    title: "Retention Policy",
    description: "Per-category retention windows with legal hold support.",
    status: "planned",
  },
] as const;
