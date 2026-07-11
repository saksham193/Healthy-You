import { database } from "./connection";
import { getMigrationStatus, runMigrations } from "./migrationRunner";

const command = process.argv[2] ?? "status";

const printStatus = (): void => {
  const status = getMigrationStatus(database);

  console.log(JSON.stringify({
    applied: status.applied.map((migration) => ({
      id: migration.id,
      name: migration.name,
      appliedAt: migration.appliedAt,
    })),
    pending: status.pending,
  }, null, 2));
};

try {
  if (command === "apply") {
    runMigrations(database);
    printStatus();
  } else if (command === "status") {
    printStatus();
  } else {
    console.error("Usage: migrateCli <apply|status>");
    process.exitCode = 1;
  }
} finally {
  database.close();
}
