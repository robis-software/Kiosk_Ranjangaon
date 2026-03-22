import { NextFunction, Request, Response } from "express";
import JsonDB from "../interface/db";
import Print from "../utils/print.utils";

interface liveData {
    live: boolean,
    battery: number,
    speed: number,
    localisation: {
        score: number,
        error: {
            code:number,
            description: string
        }
    },
    current: {
        nodeId: number | string,
        completed: boolean
    }
}

class TestController {
    private readonly db:JsonDB;
    private readonly print:Print;


    constructor() {
        this.db = new JsonDB();
        this.print = new Print();
    }

    getLocation = (req:Request, res:Response, next:NextFunction) => {
        const location = [
            {
                id: 1,
                type: 'load',
            },
            {
                id: 2,
                type: 'unload',
            },
            {
                id: 3,
                type: 'unload',
            },
            {
                id: 4,
                type: 'unload',
            },
            {
                id: 5,
                type: 'unload',
            },
            {
                id: 6,
                type: 'unload',
            },
            {
                id: 7,
                type: 'localisation',
            },
            {
                id: 8,
                type: 'charging',
            }
        ]

        try {
            res.status(200).json({message: 'Location received', data: location})
        }
        catch (error:any) {
            res.status(400).json({message: 'Error in sending Location Data', data: [], error: error})
        }
    }

    monitorData = (req:Request, res:Response, next:NextFunction) => {
        const calculateRandomScore = (range:number) => {
            return Math.round(Math.random() * range)
        }

        let liveData = {
            live: Math.random() >= 0.5,
            // battery: calculateRandomScore(100),
            battery: 20,
            speed: +(Math.random() * 2).toFixed(1),
            localisation: {
                // score: 50,
                score: calculateRandomScore(100),
                // error: Math.random() >= 0.5
                error: false
            },
            current: {
                nodeId: calculateRandomScore(6),
                completed: Math.random() >= 0.5
            }
        }

        try {
            res.status(200).json({message:'Live Data Monitoring', data: liveData})
        }
        catch (error:any) {
            res.status(400).json({message: 'Error in sending Location Data', data: [], error: error})
        }
    }

    localize = (req:Request, res:Response, next:NextFunction) => {
        res.status(200).json({message: 'Localisation Score', data: Math.round(Math.random()*100)});
    }

    serverSideEvent = (req:Request, res:Response, next:NextFunction) => {
        // 1. Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 2. Send an initial heart-beat or confirmation
        res.write('data: Connected to event stream\n\n');

        // 3. Send data at intervals
        const intervalId = setInterval(() => {
            const data = { message: 'New update!', time: new Date() };
            res.write(`data: ${JSON.stringify(this.generateLiveData())}\n\n`);
        }, 1000);

        // 4. Clean up when the client closes the connection
        req.on('close', () => {
            clearInterval(intervalId);
            res.end();
        });
    }

    // ===================================================================================================
    // Helper Functions - Privated
    // ===================================================================================================

    generateLiveData() {
        const calculateRandomScore = (range:number) => {
            return Math.round(Math.random() * range)
        }

        let liveData = {
            live: Math.random() >= 0.5,
            // battery: calculateRandomScore(100),
            battery: 22,
            speed: +(Math.random() * 2).toFixed(1),
            localisation: {
                score: 60,
                // score: calculateRandomScore(100),
                // error: Math.random() >= 0.5
                error: false
            },
            current: {
                nodeId: calculateRandomScore(6),
                completed: Math.random() >= 0.5
            }
        }

        return liveData
    }

}

export default TestController;