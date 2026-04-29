import { NextFunction, Request, Response } from "express";
import JsonDB from "../interface/db";
import Print from "../utils/print.utils";
import dotenv from 'dotenv';
import { parse } from "path";

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

        if(!this.securityCheck(req)) {
            res.status(401).json({message: 'Un-authorized to perfrom this action !!'});
            return;
        }

        try {
            await this.db.initialize(this.folderName); // For Safety Purposes
            await this.db.updateFile(this.folderName, this.fileName, JSON.stringify(config));
            res.status(201).json({message: 'Configuration has been updated!'})
        } 
        catch (error:any) {
            this.print.error('Configuration Controller => configure()',error);
            res.status(400).json({message: error});
            next(error)
        }
    }

    /**
     * Used to get the current configuration that is applied
     */
    getConfig = async (req: Request, res: Response, next:NextFunction) => {
        try {
            // const fileData = await this.db.readDataInFile(this.folderName, this.fileName);
            // res.status(200).json({message: 'Data in the File received !', data: JSON.parse(fileData)});
            const fileData = await this.fetchConfig()
            res.status(200).json({message: 'Data in the File received !', data: fileData});
        } 
        catch (error) {
            this.print.log('Confifuration Controller => getConfig()',error);
            res.status(400).json({message: error});
        }
    }

    /**
     * Used to edit the configuration's existing data
     */
    editConfig = async (req: Request, res: Response, next: NextFunction) => {

        if (!this.securityCheck(req)) {
            res.status(401).json({ message: 'Un-authorized to perform this action !!' });
            return;
        }

        const updatedData = req.body;

        try {
            // Get the existing configuration
            const existingConfiguration:any = await this.fetchConfig();

            // Only update keys that already exist in config
            Object.keys(updatedData).forEach((key:any) => {
                if (key in existingConfiguration) {
                    existingConfiguration[key] = updatedData[key];
                }
            });

            // Save the updated config
            await this.db.updateFile(this.folderName, this.fileName, JSON.stringify(existingConfiguration));
            
            res.status(200).json({
                message: 'Configuration updated successfully',
                data: existingConfiguration
            });

        } catch (error: any) {
            this.print.log('Configuration Controller => editConfig()', error);
            res.status(400).json({ message: error.message || error });
        }
    };

    /**
     * Used to fetch the configuration data from the stored json file
     * @returns Configuration data that is stored in the file
     */
    private async fetchConfig() {
        try {
            const data = await this.db.readDataInFile(this.folderName, this.fileName);
            const result = JSON.parse(data);
            return result
        }
        catch(error:any) {
            this.print.log('Configuration Controller => fetchConfig()', error);
            return {};
        }
    }

    /**
     * Used to check the security, by comparing the password to the existing one
     * @param req : Request that is from the API
     * @returns boolean
     */
    private securityCheck(req:Request):boolean {
        const header = req.headers['authorization'];    
        const password = header!.split(" ")[1];

        if(password !== process.env.CONFIGURATION) {
            return false;
        }
        return true
    }

}

export default ConfigurationController;