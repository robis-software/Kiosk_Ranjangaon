import express, {Router} from "express";
import logsRouter from "./logs.routes";
import configurationRouter from "./configuration.routes";
import testRouter from "./test.routes";
import interfaceRouter from "./interface.routes";

const indexRouter: Router = express.Router();

// Define your routes here
indexRouter.use('/logs', logsRouter);
indexRouter.use('/configuration', configurationRouter);
indexRouter.use('/test', testRouter);
indexRouter.use('/navitrol', interfaceRouter);

export default indexRouter;