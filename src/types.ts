// Cloudflare Worker environment bindings
declare global {
  /**
   * Environment variables and secrets
   */
  interface Env {
    // Add your environment variables here
    DATABASE_URL?: string;
    // Add API keys, etc.
  }
}

/**
 * Scheduled event interface for cron triggers
 */
export interface ScheduledEvent {
  /**
   * The cron pattern that triggered this event
   */
  cron: string;

  /**
   * The time the event was scheduled to be executed
   */
  scheduledTime: number;

  /**
   * How many times this event was retried
   */
  retryCount?: number;

  /**
   * Info about the cron trigger
   */
  cron_trigger?: string;
} 