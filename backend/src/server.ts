import { env } from "./config/env";
import { app } from "./app";
import { logger } from "./utils/logger";

app.listen(env.PORT, () => {
  logger.info("server_started", {
    port: env.PORT,
    environment: env.ENVIRONMENT,
  });
});
