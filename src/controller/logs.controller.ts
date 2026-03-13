import { NextFunction, Request, Response } from "express";
import JsonDB from "../db_interface/db";

class LogsController {
    db:JsonDB;

    constructor() {
        this.db = new JsonDB();
    }

    createFolder = async (req:Request, res:Response, next:NextFunction) => {
        const fileName = req.body.fileName;

        try {
            await this.db.initialize(fileName);
            res.status(200).json({message: 'Folder Created'})
        } 
        catch (error:any) {
            console.log(error);
            res.status(400).json({message: error})
        }
    }
}

export default LogsController