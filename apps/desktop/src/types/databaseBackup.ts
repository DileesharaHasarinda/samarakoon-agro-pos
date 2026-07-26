import type { PosPaginationMeta } from "./sale";

export type DatabaseBackupStatus =
  "processing" | "completed" | "failed" | "restoring" | "restored";

export interface DatabaseBackupUser {
  id: number;
  name: string;
  username: string;
}

export interface DatabaseBackup {
  id: number;
  backup_number: string;
  filename: string;
  database_name: string;
  status: DatabaseBackupStatus;
  file_size: number | null;
  checksum: string | null;
  is_scheduled: boolean;
  notes: string | null;
  error_message: string | null;
  completed_at: string | null;
  restored_at: string | null;
  created_at: string | null;
  created_by: DatabaseBackupUser | null;
  restored_by: DatabaseBackupUser | null;
  can_download: boolean;
  can_restore: boolean;
}

export interface DatabaseBackupSummary {
  total_backups: number;
  completed_backups: number;
  failed_backups: number;
  total_size: number;
  latest_completed_at: string | null;
}

export interface DatabaseBackupSettings {
  automatic_enabled: boolean;
  automatic_time: string;
  retention_days: number;
}

export interface DatabaseBackupListResponse {
  data: DatabaseBackup[];
  summary: DatabaseBackupSummary;
  settings: DatabaseBackupSettings;
  meta: PosPaginationMeta;
}

export interface DatabaseBackupResponse {
  message: string;
  data: DatabaseBackup;
}

export interface DatabaseRestoreResponse {
  message: string;

  data: {
    restored_backup_number: string;
    safety_backup_number: string;
  };
}
