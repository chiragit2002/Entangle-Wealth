import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import analyzeRouter from "./analyze";
import usersRouter from "./users";
import resumesRouter from "./resumes";
import jobsRouter from "./jobs";
import kycRouter from "./kyc";
import stripeRouter from "./stripe";
import gigsRouter from "./gigs";
import taxgptRouter from "./taxgpt";
import alpacaRouter from "./alpaca";
import newsRouter from "./news";
import gamificationRouter from "./gamification";
import tokenRouter from "./token";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(analyzeRouter);
router.use(usersRouter);
router.use(resumesRouter);
router.use(jobsRouter);
router.use(kycRouter);
router.use(stripeRouter);
router.use(gigsRouter);
router.use(taxgptRouter);
router.use(alpacaRouter);
router.use(newsRouter);
router.use(gamificationRouter);
router.use(tokenRouter);

export default router;
