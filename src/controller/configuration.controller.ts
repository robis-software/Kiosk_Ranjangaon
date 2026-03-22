import { NextFunction, Request, Response } from "express";
import JsonDB from "../interface/db";
import Print from "../utils/print.utils";
import dotenv from 'dotenv';

dotenv.config();

class ConfigurationController {
    private readonly db:JsonDB;
    private readonly folderName:string = "configuration";
    private readonly fileName:string = 'robot.config.json';
    private readonly print:Print;

    constructor() {
        this.db = new JsonDB();
        this.print = new Print();
    }
    
    /**
     * Used to Create and Update config file - Passweord Required
     */
    configure = async (req: Request, res: Response, next:NextFunction) => {
        const config = req.body.config;
        const header = req.headers['authorization'];
        const password = header!.split(" ")[1];

        if(password !== process.env.CONFIGURATION) {
            res.status(401).json({message: 'Un-authorized to perfrom this action !!'})
            return;
        }

        try {
            await this.db.initialize(this.folderName); // For Safety Purposes
            await this.db.updateFile(this.folderName, this.fileName, JSON.stringify(config));
            res.status(201).json({message: 'Configuration has been updated!'})
        } 
        catch (error:any) {
            this.print.error('Logs Controller => configure()',error);
            res.status(400).json({message: error});
            next(error)
        }
    }

    /**
     * Used to get the current configuration that is applied
     */
    getConfig = async (req: Request, res: Response, next:NextFunction) => {
        try {
            const fileData = await this.db.readDataInFile(this.folderName, this.fileName);
            res.status(200).json({message: 'Data in the File received !', data: JSON.parse(fileData)});
        } 
        catch (error) {
            this.print.log('Logs Controller => getConfig()',error);
            res.status(400).json({message: error});
        }
    }

}

export default ConfigurationController;