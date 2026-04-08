import { Router } from "express";
import { authRouter } from "../modules/auth/routes.js";
import { gmailRouter } from "../modules/integrations/gmail/index.js";
import { newsRouter } from "../modules/news/index.js";
import { usersRouter } from "../modules/users/routes.js";
import { healthRouter } from "./health.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/integrations", gmailRouter);
apiRouter.use("/news", newsRouter);
apiRouter.use("/", usersRouter);
