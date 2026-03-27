import express, {Router} from "express";
import NavitrolClientController from "../controller/navitrolClient.controller";

const interfaceRouter: Router = express.Router();
const navitrolClientController = new NavitrolClientController();

interfaceRouter.get('/live-status', navitrolClientController.monitorLiveDataV1);
interfaceRouter.get('/location-list', navitrolClientController.getLocationSymbolicIds);

interfaceRouter.post('/complete-task', navitrolClientController.sendTaskFeedback);
interfaceRouter.post('/create-task', navitrolClientController.sendTaskToRobot);
interfaceRouter.post('/initialize', navitrolClientController.initializeRobot);
interfaceRouter.post('/rotate-180', navitrolClientController.inPlaceRotation);


export default interfaceRouter