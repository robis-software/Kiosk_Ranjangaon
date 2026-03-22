import { Injectable, NgZone } from '@angular/core';
import { environment } from '../../environment/environment';
import Print from '../Utils/print';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class SseService {
  eventSource: any;
  print!:Print;

    private readonly serverEvent = new BehaviorSubject<any>({});
    serverEvent$ = this.serverEvent.asObservable();

  constructor(private readonly zone:NgZone){}

  /**
   * Used to create an initialize an new stream with the server
   * @param url : Endpoint
   * @returns boolean
   */
  Initializer(url:string) {
    console.log(url);
    this.eventSource = new EventSource(`http://${environment.api.host}:${environment.api.port}/navitrol/${url}`, {withCredentials: true});
    this.eventSource.onopen = (event:any) => {
      // this.print.log('Connection to server opened.');
    }

    if(this.eventSource) {
      // this.print.log('Connection to server opened.');
      return true
    }

    return false
  }

  /**
   * Used to get the data from the stream from the server
   */
  startStream():any {
    this.eventSource.onmessage = (event:any) => {
        const data = JSON.parse(event.data);
        this.zone.run(()=> {
            this.serverEvent.next(data);
        })
    }
  }

  /**
   * Used to close the stream from the server
   */
  closeStream() {
    if(this.eventSource) {
      this.eventSource.close();
      // this.print.log('Connection to server closed.');
    }
  }
}
