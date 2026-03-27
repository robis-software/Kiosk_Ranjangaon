import { Injectable } from "@angular/core";
import { ApiService } from "./api.service";
import Print from "../Utils/print";
import { BehaviorSubject, interval, switchMap } from "rxjs";

@Injectable ({
    providedIn: 'root'
})

export class LiveStatusService {
    print!:Print;

    private readonly liveStatus = new BehaviorSubject<any>({});
    liveStatus$ = this.liveStatus.asObservable();

    constructor(private readonly api:ApiService) {
        this.print = new Print();
    }

    initiate(){
        interval(1000).pipe(switchMap(()=> this.api.get('test/monitor', {}))).subscribe({
            next: (response:any) => {
                this.liveStatus.next(response.data);
            },
            error: (error:any) => {
                this.print.log('Error Happened while getting data from the status API', error);
                this.liveStatus.next({live: false});
                this.initiate();
            }
        })

        // setInterval(() => {
        //     this.apiCall();
        // }, 1000);
    }

    // private getData() {
    //     this.liveStream.getStream((res:any) => {
    //         this.liveStatus.next(res);
    //     })
    // }

    private apiCall() {
        this.api.get('test/monitor', {}).subscribe({
            next: (response:any) => {
                this.liveStatus.next(response.data);
            },
            error: (error:any) => {
                this.liveStatus.next({});
                this.print.log('Error Happened while getting data from the status API', error);
            }
        })
    }
}
