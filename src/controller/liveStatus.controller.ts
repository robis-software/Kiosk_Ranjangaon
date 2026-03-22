import dotenv from 'dotenv';
import { NextFunction, Request, Response } from "express";
import JsonDB from "../interface/db";
import Print from '../utils/print.utils'
import Convertor from "../utils/convertor.utils";
import TestController from './test.controller';

dotenv.config();

class LiveStatusController {
    private readonly db:JsonDB;
    private readonly folderName:string = "Logs"
    private readonly print:Print;
    private readonly test:TestController;

    constructor() {
        this.db = new JsonDB();
        this.print = new Print();
        this.test = new TestController();
    }

    serverSideEvent = (req:Request, res: Response, next:NextFunction) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
            const intervalId = setInterval(() => {
                res.write(`data: ${JSON.stringify(this.test.generateLiveData())}\n\n`);
            }, 1000);

            // 4. Clean up when the client closes the connection
            req.on('close', () => {
                clearInterval(intervalId);
                res.end();
            });
        } catch (error) {
            res.status(400).json({message: error});
            next(error)
        }
    }
}

export default LiveStatusController;