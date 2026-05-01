import { ApiService } from "../Services/api.service";
import { LogsService } from "../Services/logs.service";
import Print from "../Utils/print";

class TasksCore {
    print!:Print
    taskFor!:string
    constructor(private readonly api:ApiService, private readonly logs:LogsService, action:string){
        this.print = new Print();
        this.taskFor = action;
    }

    createTask(list:number[], sort:boolean = true):Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.api.post('navitrol/create-task', {ids: list, from: this.taskFor, sort}).subscribe({
                next: (res:any) => {
                    this.print.log(`${this.taskFor} task sent`, res);
                    this.logs.send(200, `${this.taskFor} task sent`, list);
                    resolve(true);
                },
                error: (error:any) => {
                    this.print.error('Create Task API Error', error);
                    this.logs.send(400, `${this.taskFor} task list not sent`, 'Sending Task List API Failure');
                    resolve(false)
                }
            })
        })
    }

    completeTask(id:number | string):Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.api.post('navitrol/complete-task', {id, from:this.taskFor}).subscribe({
                next: (response:any) => {
                    this.print.log(`${this.taskFor} task completed in current Node!!`, response);
                    this.print.log(`${this.taskFor} task completed at Location => ${id}`);
                    this.logs.send(200, `${this.taskFor} task completed at Location => ${id}`, '');
                    resolve(true)
                },
                error: (error:any) => {
                    this.print.error('Error happened while fetching data from the localisation', error);
                    this.logs.send(200, `${this.taskFor} task not completed at Location => ${id}`, '');
                    resolve(false)
                }
            })
        })
    }
}

export default TasksCore;
