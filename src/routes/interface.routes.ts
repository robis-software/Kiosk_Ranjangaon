import express, {Router} from "express";
import LiveStatusController from "../controller/liveStatus.controller";

const interfaceRouter: Router = express.Router();
const liveStatusController = new LiveStatusController();

interfaceRouter.get('/live-status', liveStatusController.serverSideEvent)


export default interfaceRouter