import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import analyzeRouter from "./analyze";
import usersRouter from "./users";
import resumesRouter from "./resumes";
import jobsRouter from "./jobs";
import kycRouter from "./kyc";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(analyzeRouter);
router.use(usersRouter);
router.use(resumesRouter);
router.use(jobsRouter);
router.use(kycRouter);

export default router;
