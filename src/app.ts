import express, { Application, NextFunction, Request, Response } from "express";
import cors from 'cors';
import dotenv from "dotenv";
import indexRouter from "./routes/index.routes";

// Declaring the  Dotenv
dotenv.config();

// Creating an Instance to express in the name of app
const app: Application = express();
const corsOptions = {
  origin: 'http://localhost:4200',
  credentials: true
}

// Middleware is used to use the JSON as response and CORS policy for Identification
app.use(express.json());
app.use(cors(corsOptions));

app.use(indexRouter);

// Error Handling Middleware is written
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.log("caught err: ", error);
  res.status(500).json({ success: false, message: "Internal server error", error: error.message });
});


// Backend Server has been listened in this Respective por
app.listen(process.env.HOST_PORT, (error:any) => {
  error ? console.log("Error while connecting server : ", error) : console.log("Backend Server Started!!", process.env.HOST_PORT);
});
