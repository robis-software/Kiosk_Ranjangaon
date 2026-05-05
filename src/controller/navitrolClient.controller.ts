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

    /**
     * Used to get the live data from the robot by calling multiple API at same time
     */
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

    /**
     * Used to get the location ids that are stored in the robot
     */
    getLocationSymbolicIds = async(req:Request, res:Response, next:NextFunction) => {
        try {
            const response = await this.fetchData(process.env.LOCATION_LIST);
            res.status(200).json({message: 'List of locations for the robot', data:response});
        } 
        catch (error) {
            this.print.log('API Call Failed: getLocationSymbolicIds() in NavitrolClientController');
            res.status(400).json({message: 'Error Happened while getting the locations list from the robot', error});
        }
    }

    /**
     * Used to send the task list to the robot to execute, and based on the state change the list will be updated, whether in sorted order or in unsorted order
     */
    sendTaskToRobot = async(req:Request, res:Response, next:NextFunction) => {
        try {
            const response = this.postData(process.env.SEND_TASKS, req.body);
            res.status(200).json({message: 'Task List has been send to the robot', data: response})
        } 
        catch (error) {
            this.print.log('API Call Failed: sendTaskToRobot() in NavitrolClientController');
            res.status(400).json({message: 'Error Happened while sending the task list to the robot', error});
        }
    }

    /**
     * Used to send the task completion feedback to the robot.
     */
    sendTaskFeedback = async (req:Request, res:Response, next:NextFunction) => {
        try {
            const response = await this.postData(process.env.COMPLETE_TASK, {});
            res.status(200).json({message: 'Task List has been send to the robot', data: response})
        } 
        catch (error) {
            this.print.log('API Call Failed: sendTaskFeedback() in NavitrolClientController');
            res.status(400).json({message: 'Error Happened while sending the task list to the robot', error});
        }
    }

    /**
     * Used to localize the robot in the environment
     */
    initializeRobot = async(req:Request, res:Response, next:NextFunction) => {
        try {
            const response = await this.postData(process.env.LOCALIZE, req.body);
            res.status(200).json({message: 'Initialize API has been sent to robot', data: response.data})
        } 
        catch (error) {
            this.print.log('API Call Failed: initializeRobot() in NavitrolClientController');
            res.status(400).json({message: 'Error Happened while initializin robot', error});
        }
    }

    /**
     * Used to rotate the robot from it position, rotation angle - 180 deg
     */
    inPlaceRotation = async(req:Request, res:Response, next:NextFunction) => {
        try {
            // No Body
            const response = await this.postData(process.env.ROTATE_180, {}); 
            res.status(200).json({message: 'Pivot API has been sent to robot', data: response.data})
        } 
        catch (error) {
            this.print.log('API Call Failed: inPlaceRotation() in NavitrolClientController');
            res.status(400).json({message: 'Error Happened while Rotating the robot', error});
        }
    }

    /**
     * Used to get the status of the rotation of the robot.
     */
    inPlaceRotationStatus = async(req:Request, res:Response, next:NextFunction) => {
        try {
           const response = await this.fetchData(process.env.ROTATE_180_STATUS);
           res.status(200).json({message: 'Pivot rotation status API has been fetched from the robot', data: response}) 
        } catch (error) {
            this.print.log('API Call Failed: inPlaceRotationStatus() in NavitrolClientController');
            res.status(400).json({message: 'Error Happened getting the rotation of the robot', error});
        }
    }

    /**
     * Used to set the reference location to the robot
     */
    setPickLocation = async(req:Request, res:Response, next:NextFunction) => {
        try {
            const response = await this.postData(process.env.PICK_POINT, req.body); 
            res.status(200).json({message: 'Pick Point location has set in the robot', data: response.data})
        } 
        catch (error) {
            this.print.log('API Call Failed: setPickLocation() in NavitrolClientController');
            res.status(400).json({message: 'Error Happened while set pick point location is fixed in robot', error});
        }
    }

    /**
     * Used to get the charging status of the robot.
     */
    getChargingStatus = async(req:Request, res:Response, next:NextFunction) => {
        try {
            const response = await this.fetchData(process.env.CHARGING_STATUS);
            res.status(200).json({message: 'Charging status of the robot has been fetched', data:response.status});
        } 
        catch (error) {
            this.print.log('API Call Failed: getChargingStatus() in NavitrolClientController');
            res.status(400).json({message: 'Error Happened while getting charging status of the robot', error});
        }
    }

    /**
     * Used to set the operating speed of the robot.
     */
    setRobotSpeed = async(req:Request, res:Response, next:NextFunction) => {
        try {
            const response = await this.postData(process.env.ROBOT_SPEED, req.body); 
            res.status(200).json({message: 'Robot speed has been changed and updated', data: response.data})
        } 
        catch (error) {
            this.print.log('API Call Failed: setRobotSpeed() in NavitrolClientController');
            res.status(400).json({message: 'Error Happened while configuring operating speed in robot', error});
        }
    }

    // ===================================================================================================
    // Helper Functions - Privated
    // ===================================================================================================

    private async fetchData(endPoint:any):Promise<any> {
        try {
           const response = await this.api.get(endPoint);
           return response.data
        }
        catch (error:any) {
            return error
        }
    }

    private async postData(endPoint:any, body:any):Promise<any> {
        try {
           const response = await this.api.post(endPoint, body);
           return response.data
        }
        catch (error:any) {
            return error
        }
    }

    private async liveResponse():Promise<string> {
        try {
            const [localisation, battery, speed, currentNode, chargingStatus] = await Promise.all([
                this.fetchData(process.env.LOCALIZATION),
                this.fetchData(process.env.BATTERY),
                this.fetchData(process.env.SPEED),
                this.fetchData(process.env.CURRENT_NODE),
                this.fetchData(process.env.CHARGING_STATUS)
            ]);

            const live = !!(localisation && (+battery?.percentage >= 0) && (speed !== null) && currentNode) ;

            const response = {
                date:new Date().toLocaleTimeString().split(' ')[0],
                live,
                localisation, 
                battery: battery.percentage,
                temperature: battery.temperature,
                speed: speed < 0  ? (-speed) : speed, 
                currentNode,
                chargingStatus: chargingStatus.status
            };
            return JSON.stringify(response);
        }
        catch (error) {
            this.print.log('API Error from Navitrol', error);
            console.clear();
            return JSON.stringify({live: false});
        }
    }

}

export default NavitrolClientController;