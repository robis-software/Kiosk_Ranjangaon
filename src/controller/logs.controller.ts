import dotenv from 'dotenv';
import { NextFunction, Request, Response } from "express";
import JsonDB from "../interface/db";
import Print from '../utils/print.utils'
import Convertor from "../utils/convertor.utils";

dotenv.config();

class LogsController {
    private readonly db:JsonDB;
    private readonly folderName:string = "Logs"
    private readonly print:Print
    private readonly convertor:Convertor

    constructor() {
        this.db = new JsonDB();
        this.print = new Print();
        this.convertor = new Convertor();
    }

    // ===================================================================================================
    // Controller Functions
    // ===================================================================================================


    /**
     * Used to authenicate that they are allowed to view logs
     */
    authenicate = async(req: Request, res:Response, next:NextFunction) => {
        const header = req.headers['authorization'];
        const password = header!.split(" ")[1];

        try {
            if(password === process.env.LOGS) {
                res.status(200).json({message: 'User Authenicated', data: true})
            }
            else {
                res.status(401).json({message: 'User Unauthorized', data: false})
            }
        } 
        catch (error:any) {
            this.print.error('Logs Controller => Log()',error);
            res.status(400).json({message: error});
        }
    }

    /**
     * Used to store the log in the respective file
     */
    log = async(req:Request, res:Response, next:NextFunction) => {
        const message = req.body.message;
        const fileName = this.generateFileName();
        try {
            // For UI
            await this.db.initialize(this.folderName);
            await this.db.insertDataToFile(this.folderName, fileName, message);

            res.status(201).json({message: 'File Created', fileName});
        }
        catch (error:any) {
            this.print.error('Logs Controller => Log()',error);
            res.status(400).json({message: error});
        }
    }

    /**
     * Used to get the list of the files in the respective folder
     */
    getLogsList = async(req: Request, res: Response, next:NextFunction) => {
        try {
            const listOfFileName = await this.db.getListOfFile(this.folderName);
            res.status(200).json({message: 'List received !', data: listOfFileName});
        }
        catch (error:any) {
            this.print.log('Logs Controller => getLogsList()',error);
            res.status(400).json({message: error});
        }

    }

    /**
     * Used to get the data in the respective file from the respective folder -V1 (Return all the values in the file)
     */
    getLogData = async(req: Request, res: Response, next:NextFunction) => {
        const fileName = req.params.fileName as string;

        try {
            const fileData = await this.db.readDataInFile(this.folderName, fileName);
            const convertedJSON:any = this.convertor.convertResponseIntoJSON(fileData);
            res.status(200).json({message: 'Data in the File received !', data: convertedJSON});
        } 
        catch (error) {
            this.print.log('Logs Controller => getLogData()',error);
            res.status(400).json({message: error});
        }
    }

    /**
     * Used to get the data in the respective file from the respective folder - V2 (Returns the file based on the 1 Hour Filter)
     */
    getLogDataV2 = async(req: Request, res: Response, next:NextFunction) => {
        const fileName = req.params.fileName as string;
        const time:any = req.params.time as string;
        // const from = req.body.from; // Paginatin Logic
        // const to = req.body.to;
        // const total = req.body!.total

        // let response:any = {}; //Pagination Logic

        try {
            const fileData = await this.db.readDataInFile(this.folderName, fileName);
            const convertedJSON:any = this.convertor.convertResponseIntoJSON(fileData);

            // Only this logc works for 1 hour interval
            const hour = Number.parseInt(time.split(':')[0]);
            const filteredData = convertedJSON.filter((item: any) => {
                return item.time.startsWith(hour.toString().padStart(2, '0'));
            });

            // if(total === 0 || total === null || total === undefined) { // Pagination Logic
            //     response['total'] = convertedJSON.length;
            // }

            // const data = convertedJSON.slice(from-1, to) // Pagination Logic

            // response['data'] = data; // Pagination Logic
            // response['from'] = from;
            // response['to'] = to;

            res.status(200).json({message: 'Data in the File received !', data: filteredData});
        } 
        catch (error) {
            this.print.log('Logs Controller => getLogData()',error);
            res.status(400).json({message: error});
        }
    }

    /**
     * Used to get the data in the respective file from the respective folder - V3 (Returns all values, along with pagination and 1 Hour Filtered Data)
     */
    getLogDataV3 = async(req: Request, res: Response, next:NextFunction) => {
        const fileName = req.params.fileName as string;
        const time:any = req.params.time as string;
        const from = req.body.from; // Paginatin Logic
        const to = req.body.to;
        const total = req.body!.total

        let response:any = {}; //Pagination Logic

        try {
            const fileData = await this.db.readDataInFile(this.folderName, fileName);
            const convertedJSON:any = this.convertor.convertResponseIntoJSON(fileData);

            // Only this logc works for 1 hour interval
            const hour = Number.parseInt(time.split(':')[0]);
            const filteredData = convertedJSON.filter((item: any) => {
                return item.time.startsWith(hour.toString().padStart(2, '0'));
            });

            if(total === 0 || total === null || total === undefined) { // Pagination Logic
                response['total'] = convertedJSON.length;
            }

            const data = convertedJSON.slice(from-1, to) // Pagination Logic

            response['data'] = data; // Pagination Logic
            response['from'] = from;
            response['to'] = to;

            res.status(200).json({message: 'Data in the File received !', data: convertedJSON, response, filteredData});
        } 
        catch (error) {
            this.print.log('Logs Controller => getLogData()',error);
            res.status(400).json({message: error});
        }
    }

    /**
     * Used to delete all logs in the respective folder
     */
    deleteAllLogs = async(req: Request, res: Response, next:NextFunction) => {
        const header = req.headers['authorization'];
        const password = header!.split(" ")[1];

        if(password !== process.env.LOGS) {
            res.status(401).json({message: 'Un-authorized to perfrom this action !!'})
            return;
        }

        try {
            await this.db.deleteFolderInDB(this.folderName);
            res.status(204).json({message: 'All Logs has been cleared in this system !!'})
        } 
        catch (error) {
            this.print.log('Logs Controller => deleteAllLogs()',error);
            res.status(400).json({message: error});
        }
    }

    // ===================================================================================================
    // Helper Functions - Privated
    // ===================================================================================================

    /**
     * Used to create an file name for daily basis
     * @returns generated file based on the date
     */
    private generateFileName():string {
        const date = new Date();
        console.log(date.toDateString(), date.toTimeString())
        return `${date.toDateString().split(' ').slice(1,4).join('-')}.log`
    }
}

export default LogsController