import express, {Router} from "express";
import TestController from "../controller/test.controller";

const testRouter: Router = express.Router();
const testController = new TestController();

testRouter.get('/location', testController.getLocation);
testRouter.get('/monitor', testController.monitorData);
testRouter.get('/localize', testController.localize);
testRouter.get('/sse', testController.serverSideEvent);


export default testRouter;