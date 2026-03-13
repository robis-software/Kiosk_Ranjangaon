import express, {Router} from "express";
import logsRouter from "./logs.routes";

const indexRouter: Router = express.Router();

// Define your routes here
indexRouter.use('/logs', logsRouter);

export default indexRouter;