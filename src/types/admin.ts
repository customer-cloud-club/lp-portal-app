/**
 * Admin panel related type definitions
 */

/**
 * Statistics data for admin dashboard
 */
export interface AdminStats {
  /** Total number of users */
  totalUsers: number;
  /** Number of active users in the last 30 days */
  activeUsers: number;
  /** Total number of tasks */
  totalTasks: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Number of pending tasks */
  pendingTasks: number;
  /** System uptime in seconds */
  uptime: number;
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Admin settings configuration
 */
export interface AdminSettings {
  /** Maximum number of tasks per user */
  maxTasksPerUser: number;
  /** Auto-cleanup interval in days */
  autoCleanupDays: number;
  /** Enable notifications */
  enableNotifications: boolean;
  /** Email notification settings */
  emailNotifications: boolean;
  /** Debug mode enabled */
  debugMode: boolean;
  /** API rate limit per minute */
  apiRateLimit: number;
}

/**
 * Admin panel state
 */
export interface AdminPanelState {
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current statistics */
  stats: AdminStats | null;
  /** Current settings */
  settings: AdminSettings | null;
}
