import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import scanRouter from "./scan";
import logsRouter from "./logs";
import alertsRouter from "./alerts";
import analyticsRouter from "./analytics";
import networkAnalysisRouter from "./networkAnalysis";
import liveTrafficRouter from "./liveTraffic";
import summaryRouter from "./summary";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Public routes — no auth required
router.use(healthRouter);
router.use(authRouter);
router.use(liveTrafficRouter);

// Protected routes — JWT required for all data endpoints
router.use(requireAuth);
router.use(scanRouter);
router.use(logsRouter);
router.use(alertsRouter);
router.use(analyticsRouter);
router.use(networkAnalysisRouter);
router.use(summaryRouter);

export default router;
