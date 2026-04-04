import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import Print from '../Utils/print';

@Injectable({
  providedIn: 'root'
})
export class LogsService {
    print!:Print
    constructor(private readonly api:ApiService) {
        this.print = new Print();
    }

    send(status:number, title:any, description:any) {
        let payload = {
            time:this.time(),
            title,
            status,
            description
        }

        let isApiSuccess:boolean = false

        this.api.post('logs', {message: JSON.stringify(payload)}).subscribe({
            next: (response:any) => {
                isApiSuccess = true;
            },
            error: (error:any) => {
                isApiSuccess = false;
                this.print.log('Error Happened while logging the action to the API', error)
            }
        })

        return isApiSuccess;
    }

    private time():any {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`
    }

}
