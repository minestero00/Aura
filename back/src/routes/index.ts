import { Router } from "express";
import { authRouter } from "../modules/auth/routes.js";
import { briefingsRouter } from "../modules/briefings/index.js";
import { calendarRouter } from "../modules/calendar/index.js";
import { chatRouter } from "../modules/chat/index.js";
import { gmailRouter } from "../modules/integrations/gmail/index.js";
import { newsRouter } from "../modules/news/index.js";
import { usageRouter } from "../modules/usage/index.js";
import { usersRouter } from "../modules/users/routes.js";
import { healthRouter } from "./health.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/calendar", calendarRouter);
apiRouter.use("/chat", chatRouter);
apiRouter.use("/briefings", briefingsRouter);
apiRouter.use("/integrations", gmailRouter);
apiRouter.use("/news", newsRouter);
apiRouter.use("/usage", usageRouter);
apiRouter.use("/", usersRouter);
