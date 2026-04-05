import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import analyzeRouter from "./analyze";
import usersRouter from "./users";
import resumesRouter from "./resumes";
import jobsRouter from "./jobs";
import kycRouter from "./kyc";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(analyzeRouter);
router.use(usersRouter);
router.use(resumesRouter);
router.use(jobsRouter);
router.use(kycRouter);
router.use(stripeRouter);

export default router;
