import type { Env } from "./env.schema";

/* The typed configuration surface exposed by `ConfigService`. */
export type AppConfig = Env & {
  /** Number of milliseconds before a DB query times out (reserved). */
  dbQueryTimeoutMs: number;
};
