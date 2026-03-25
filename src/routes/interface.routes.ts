import express, {Router} from "express";
import NavitrolClientController from "../controller/navitrolClient.controller";

const interfaceRouter: Router = express.Router();
const navitrolClientController = new NavitrolClientController();

interfaceRouter.get('/live-status', navitrolClientController.monitorLiveDataV1)


export default interfaceRouter