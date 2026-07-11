import type { Request, Response } from "express";
import { env } from "../config/env";
import { database } from "../database/connection";
import { getMigrationStatus } from "../database/migrationRunner";
import { getMonitoringSnapshot } from "../monitoring/metrics";

const readDatabaseStatus = () => {
  try {
    const migrationStatus = getMigrationStatus(database);

    return {
      databaseReady: true,
      migrationsReady: migrationStatus.pending.length === 0,
      migrations: {
        appliedCount: migrationStatus.applied.length,
        pendingCount: migrationStatus.pending.length,
      },
    };
  } catch {
    return {
      databaseReady: false,
      migrationsReady: false,
      migrations: {
        appliedCount: 0,
        pendingCount: 0,
      },
    };
  }
};

export class StatusController {
  health = (request: Request, response: Response): void => {
    response.json({ data: { status: "ok", timestamp: new Date().toISOString(), requestId: request.requestId } });
  };

  status = (request: Request, response: Response): void => {
    const databaseStatus = readDatabaseStatus();

    response.json({
      data: {
        status: databaseStatus.databaseReady && databaseStatus.migrationsReady ? "ok" : "degraded",
        service: "healthy-you-backend",
        environment: env.ENVIRONMENT,
        openAIConfigured: Boolean(env.OPENAI_API_KEY),
        databaseReady: databaseStatus.databaseReady,
        migrationsReady: databaseStatus.migrationsReady,
        requestId: request.requestId,
        monitoring: env.MONITORING_SAFE_STATUS_ENABLED
          ? {
            ...getMonitoringSnapshot(),
            database: databaseStatus,
          }
          : undefined,
      },
    });
  };
}
