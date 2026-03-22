import express, {Router} from "express";
import LogsController from "../controller/logs.controller";

const logsRouter: Router = express.Router();

const logsController = new LogsController();

logsRouter.post('/authenicate', logsController.authenicate); // Used to authenicate that the current user has access to Logs
logsRouter.post('/', logsController.log); // Used to store an new log in the file
logsRouter.get('/', logsController.getLogsList); // Used to get the list of logs in the folder - Old One
logsRouter.get('/:fileName', logsController.getLogData); // Used to get the log data of an particular file
logsRouter.get('/v2/:fileName/:time', logsController.getLogDataV2); // Used to get the log data of an particular file - Currently Used
logsRouter.get('/v3/:fileName/:time', logsController.getLogDataV3); // Used to get the log data of an particular file - Need to discuss
logsRouter.delete('/', logsController.deleteAllLogs); // Used to clear all the logs that are stored.

export default logsRouter;