import { apiRequest } from "../lib/api";

import type {
  DatabaseBackupListResponse,
  DatabaseBackupResponse,
  DatabaseRestoreResponse,
} from "../types/databaseBackup";

function getApiBaseUrl(): string {
  const environment = import.meta.env as Record<string, string | undefined>;

  return (
    environment.VITE_API_BASE_URL ??
    environment.VITE_API_URL ??
    "http://127.0.0.1:8000/api/v1"
  ).replace(/\/+$/, "");
}

export function getDatabaseBackups(
  token: string,
  parameters: {
    search?: string;
    status?: string;
    page?: number;
    perPage?: number;
  }
): Promise<DatabaseBackupListResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.status) {
    query.set("status", parameters.status);
  }

  return apiRequest<DatabaseBackupListResponse>(
    `/database-backups?${query.toString()}`,
    {
      method: "GET",
      token,
    }
  );
}

export function createDatabaseBackup(
  token: string,
  notes: string
): Promise<DatabaseBackupResponse> {
  return apiRequest<DatabaseBackupResponse>("/database-backups", {
    method: "POST",
    token,

    body: JSON.stringify({
      notes: notes.trim() || null,
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

export function deleteDatabaseBackup(
  token: string,
  backupId: number
): Promise<{
  message: string;
}> {
  return apiRequest<{
    message: string;
  }>(`/database-backups/${backupId}`, {
    method: "DELETE",
    token,
  });
}

export async function downloadDatabaseBackup(
  token: string,
  backupId: number,
  fallbackFilename: string
): Promise<void> {
  const response = await fetch(
    `${getApiBaseUrl()}/database-backups/${backupId}/download`,
    {
      method: "GET",

      headers: {
        Accept: "application/sql",

        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    let message = "Unable to download the backup file.";

    try {
      const errorBody = (await response.json()) as {
        message?: string;
      };

      message = errorBody.message ?? message;
    } catch {
      // Keep the default message.
    }

    throw new Error(message);
  }

  const blob = await response.blob();

  const contentDisposition = response.headers.get("Content-Disposition");

  const match = contentDisposition?.match(/filename="?([^"]+)"?/i);

  const filename = match?.[1] ?? fallbackFilename;

  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = objectUrl;

  link.download = filename;

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}
