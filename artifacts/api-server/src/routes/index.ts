import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import analyzeRouter from "./analyze";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(analyzeRouter);

export default router;
