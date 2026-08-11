import { apiRequest } from "../lib/api";

import type {
  DatabaseBackup,
  DatabaseBackupSettings,
  DatabaseBackupSummary,
} from "../types/databaseBackup";

import type { PosPaginationMeta } from "../types/sale";

interface BackupFilters {
  search?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

interface DatabaseBackupListResponse {
  data: DatabaseBackup[];
  summary: DatabaseBackupSummary;
  settings: DatabaseBackupSettings;
  meta: PosPaginationMeta;
}

interface DatabaseBackupMutationResponse {
  message: string;
  data: DatabaseBackup;
}

export interface DatabaseRestoreData {
  restored_backup_number: string;
  safety_backup_number: string;
  uploaded_backup_number?: string;
  uploaded_filename?: string;
}

export interface DatabaseRestoreResponse {
  message: string;
  data: DatabaseRestoreData;
}

interface DatabaseBackupDeleteResponse {
  message: string;
}

interface ErrorPayload {
  message?: string;
  errors?: Record<string, string[]>;
}

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_URL ??
    "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJsonPayload(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  const message = payload.message;

  const errors = payload.errors;

  if (isRecord(errors)) {
    for (const value of Object.values(errors)) {
      if (Array.isArray(value)) {
        const first = value.find((item) => typeof item === "string");

        if (typeof first === "string" && first.trim() !== "") {
          return first;
        }
      }
    }
  }

  if (typeof message === "string" && message.trim() !== "") {
    return message;
  }

  return fallback;
}

function isRestoreResponse(value: unknown): value is DatabaseRestoreResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.message !== "string" || !isRecord(value.data)) {
    return false;
  }

  return (
    typeof value.data.restored_backup_number === "string" &&
    typeof value.data.safety_backup_number === "string"
  );
}

function fileNameFromDisposition(
  headerValue: string | null,
  fallback: string
): string {
  if (!headerValue) {
    return fallback;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(headerValue);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/^["']|["']$/g, ""));
    } catch {
      // Fall through to normal filename.
    }
  }

  const filenameMatch = /filename="?([^";]+)"?/i.exec(headerValue);

  const filename = filenameMatch?.[1]?.trim();

  return filename || fallback;
}

export function getDatabaseBackups(
  token: string,
  filters: BackupFilters = {}
): Promise<DatabaseBackupListResponse> {
  const params = new URLSearchParams();

  if (filters.search && filters.search.trim() !== "") {
    params.set("search", filters.search.trim());
  }

  if (filters.status && filters.status !== "") {
    params.set("status", filters.status);
  }

  if (filters.page) {
    params.set("page", String(filters.page));
  }

  if (filters.perPage) {
    params.set("per_page", String(filters.perPage));
  }

  const query = params.toString();

  return apiRequest<DatabaseBackupListResponse>(
    `/database-backups${query ? `?${query}` : ""}`,
    {
      method: "GET",
      token,
    }
  );
}

export function createDatabaseBackup(
  token: string,
  notes: string
): Promise<DatabaseBackupMutationResponse> {
  return apiRequest<DatabaseBackupMutationResponse>("/database-backups", {
    method: "POST",
    token,

    body: JSON.stringify({
      notes: notes.trim() !== "" ? notes.trim() : null,
    }),
  });
}

export function restoreDatabaseBackup(
  token: string,
  backupId: number
): Promise<DatabaseRestoreResponse> {
  return apiRequest<DatabaseRestoreResponse>(
    `/database-backups/${backupId}/restore`,
    {
      method: "POST",
      token,

      body: JSON.stringify({
        confirmation: "RESTORE",
      }),
    }
  );
}

/**
 * Upload an external SQL file and restore it.
 *
 * This uses fetch directly because FormData
 * must not be sent with a JSON Content-Type.
 */
export async function uploadAndRestoreDatabaseBackup(
  token: string,
  backupFile: File
): Promise<DatabaseRestoreResponse> {
  const formData = new FormData();

  formData.append("backup_file", backupFile);

  formData.append("confirmation", "RESTORE");

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/database-backups/upload-restore`, {
      method: "POST",

      headers: {
        Accept: "application/json",

        Authorization: `Bearer ${token}`,
      },

      body: formData,
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Unable to connect to the backup server: ${error.message}`
        : "Unable to connect to the backup server."
    );
  }

  const payload = await readJsonPayload(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        payload,
        "Unable to restore the uploaded database backup."
      )
    );
  }

  if (!isRestoreResponse(payload)) {
    throw new Error(
      "The server returned an invalid database restore response."
    );
  }

  return payload;
}

export function deleteDatabaseBackup(
  token: string,
  backupId: number
): Promise<DatabaseBackupDeleteResponse> {
  return apiRequest<DatabaseBackupDeleteResponse>(
    `/database-backups/${backupId}`,
    {
      method: "DELETE",

      token,
    }
  );
}

export async function downloadDatabaseBackup(
  token: string,
  backupId: number,
  fallbackFilename: string
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/database-backups/${backupId}/download`,
      {
        method: "GET",

        headers: {
          Accept: "application/octet-stream",

          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Unable to connect to the backup server: ${error.message}`
        : "Unable to connect to the backup server."
    );
  }

  if (!response.ok) {
    const payload = await readJsonPayload(response);

    throw new Error(
      getErrorMessage(
        payload,
        `Unable to download the database backup. Server returned ${response.status}.`
      )
    );
  }

  const blob = await response.blob();

  if (blob.size <= 0) {
    throw new Error("The downloaded database backup is empty.");
  }

  const filename = fileNameFromDisposition(
    response.headers.get("Content-Disposition"),
    fallbackFilename
  );

  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = objectUrl;

  link.download = filename;

  link.style.display = "none";

  document.body.appendChild(link);

  link.click();

  link.remove();

  /*
   * Give Chromium/Electron enough time to
   * start the file save before releasing the
   * object URL.
   */
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}
