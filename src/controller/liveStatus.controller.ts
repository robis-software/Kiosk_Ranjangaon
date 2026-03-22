import dotenv from 'dotenv';
import { NextFunction, Request, Response } from "express";
import JsonDB from "../interface/db";
import Print from '../utils/print.utils'
import TestController from './test.controller';
import ApiUtils from '../utils/api.utils';
import { stringify } from 'node:querystring';

dotenv.config();

class LiveStatusController {
    private readonly db:JsonDB;
    private readonly folderName:string = "Logs"
    private readonly print:Print;
    private readonly test:TestController;
    private readonly api:ApiUtils;

    constructor() {
        this.db = new JsonDB();
        this.print = new Print();
        this.test = new TestController();
        this.api = new ApiUtils();
    }

    serverSideEvent = (req:Request, res: Response, next:NextFunction) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
            const intervalId = setInterval(async() => {
                res.write(`data: ${await this.liveResponse()}\n\n`);
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

    // ===================================================================================================
    // Helper Functions - Privated
    // ===================================================================================================

    private async fetchData(endPoint:string):Promise<string> {
        try {
           const response = await this.api.get(endPoint);
           return response.data
        }
        catch (error:any) {
            return error
        }
    }


    private async liveResponse():Promise<string> {
    const [localisation, battery, speed, currentNode] = await Promise.all([
            this.fetchData(process.env.LOCALIZATION as string),
            this.fetchData(process.env.BATTERY as string),
            this.fetchData(process.env.SPEED as string),
            this.fetchData(process.env.CURRENT_NODE as string)
        ]);

        const live = !!(localisation && battery && speed && currentNode);

        const response = {
            localisation, 
            battery, 
            speed, 
            currentNode, 
            live
        };
        
        return JSON.stringify(response);
    }

}

export default LiveStatusController;