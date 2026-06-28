import { env } from "./config/env";
import { app } from "./app";
import { logger } from "./utils/logger";

app.listen(env.PORT, () => {
  logger.info(`Healthy You backend listening on port ${env.PORT}`);
});
