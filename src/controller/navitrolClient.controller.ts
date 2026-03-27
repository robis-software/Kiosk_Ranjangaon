import dotenv from 'dotenv';
import { NextFunction, Request, Response } from "express";
import JsonDB from "../interface/db";
import Print from '../utils/print.utils';
import ApiUtils from '../utils/api.utils';
import LogsController from './logs.controller';

dotenv.config();

class NavitrolClientController {
    private readonly db:JsonDB;
    private readonly folderName:string = "Logs"
    private readonly print:Print;
    private readonly api:ApiUtils;

    constructor() {
        this.db = new JsonDB();
        this.print = new Print();
        this.api = new ApiUtils();
    }

    // Changed based on the suggestion from ChatGPT
    monitorLiveDataV2 = (req:Request, res: Response, next:NextFunction) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let isExecuted:boolean = false;

        const sendData = async() => {
            if(isExecuted) return
            isExecuted = true;

            try {
                res.write(`data: ${await this.liveResponse()}\n\n`);
            } 
            catch (error) {
                this.print.error('Stream Data Error',error)
            }
            finally {
                isExecuted = false;
            }
        }

        const intervalId = setInterval(sendData, 1000);

        req.on('close', () => {
            this.print.log('Client disconnected');
            clearInterval(intervalId);
            res.end();
        });

        req.on('error', (err) => {
            this.print.error('Request error:', err);
            clearInterval(intervalId);
            res.end();
        });

    }

    // Written by Vigneswara
    monitorLiveDataV1 = (req:Request, res: Response, next:NextFunction) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
            const intervalId = setInterval(async() => {
                res.write(`data: ${await this.liveResponse()}\n\n`);
            }, 1000);

            req.on('close', () => {
                clearInterval(intervalId);
                res.end();
            });

        } catch (error) {
            res.status(400).json({message: error});
            next(error)
        }
    }

    getLocations = async(req:Request, res:Response, next:NextFunction) => {
        try {
            const locationList = await this.fetchData(process.env.LOCATION_LIST);
            res.status(200).json({message: 'Location List that are available', data: locationList});
        }
        catch (error:any) {
            this.print.log('Navitrol Controller => getLocations()',error);
            res.status(400).json({message: error});
        }
    }



    // ===================================================================================================
    // Helper Functions - Privated
    // ===================================================================================================

    private async fetchData(endPoint:any):Promise<string> {
        try {
           const response = await this.api.get(endPoint);
           return response.data
        }
        catch (error:any) {
            return error
        }
    }


    private async liveResponse():Promise<string> {
        try {
            const [localisation, battery, speed, currentNode] = await Promise.all([
                this.fetchData(process.env.LOCALIZATION),
                this.fetchData(process.env.BATTERY),
                this.fetchData(process.env.SPEED),
                this.fetchData(process.env.CURRENT_NODE)
            ]);

            const live = !!(localisation && (+battery >= 0) && (+speed >= 0) && currentNode) ;

            const response = {
                live,
                localisation, 
                battery, 
                speed, 
                currentNode
            };
        
            return JSON.stringify(response);
        }
        catch (error) {
            this.print.log('API Error from Navitrol', error);
            console.clear();
            return JSON.stringify({});
        }
    }

}

export default NavitrolClientController;