import express, {Router} from "express";
import LogsController from "../controller/logs.controller";

const logsRouter: Router = express.Router();

const logsController = new LogsController();

// logsRouter.post('/'); // Used to store an new log in the file
// logsRouter.get('/'); // Used to get the list of logs in the folder
// logsRouter.get('/:fileName'); // Used to get the log data of an particular file

// Testing
logsRouter.post('/', logsController.createFolder)


export default logsRouter;