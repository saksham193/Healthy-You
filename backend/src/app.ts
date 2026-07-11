import "./types/express";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { initializeDatabase } from "./database/connection";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requireJsonContentType } from "./middleware/requestHardening";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { apiRateLimit } from "./middleware/security";
import { aiRoutes } from "./routes/aiRoutes";
import { authRoutes } from "./routes/authRoutes";
import { memoryRoutes } from "./routes/memoryRoutes";
import { profileRoutes } from "./routes/profileRoutes";
import { statusRoutes } from "./routes/statusRoutes";
import { syncRoutes } from "./routes/syncRoutes";
import { userRoutes } from "./routes/userRoutes";

initializeDatabase();

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
app.use(requestId);
app.use(requestLogger);
app.use(statusRoutes);
app.use(apiRateLimit);
app.use(requireJsonContentType);
app.use(express.json({ limit: env.REQUEST_BODY_LIMIT_JSON }));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/ai", aiRoutes);
app.use("/memories", memoryRoutes);
app.use("/profile", profileRoutes);
app.use("/sync", syncRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
