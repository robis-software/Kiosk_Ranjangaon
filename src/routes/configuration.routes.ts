import express, { Router } from 'express';
import ConfigurationController from '../controller/configuration.controller';

const configurationRouter: Router = express.Router();
const configurationController = new ConfigurationController();

configurationRouter.post('/', configurationController.configure);
configurationRouter.get('/', configurationController.getConfig);
configurationRouter.put('/', configurationController.editConfig);

export default configurationRouter;