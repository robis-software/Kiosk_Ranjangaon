import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { ScreenSaverComponent } from "../Sections/screen-saver/screen-saver.component";
import Print from '../Utils/print';
import { LayoutComponent } from "../layout/layout.component";
import { ApiService } from '../Services/api.service';
import { SessionStorageService } from '../Services/session-storage.service';
import { LiveStatusService } from '../Services/live-status.service';
import { environment } from '../../environment/environment';
import { SseService } from '../Services/sse.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ScreenSaverComponent, LayoutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  isScreenSaver:boolean = true; //Change to true
  timeOut:any;
  print!:Print;

  timeInMintes = environment.screenTimeOut;

  constructor(private readonly api:ApiService, private readonly ss:SessionStorageService, private readonly liveStatus:LiveStatusService, private readonly liveStream:SseService) {}

  ngOnInit(): void {
    this.print = new Print();
    this.getConfiguration();
    this.liveStream.Initializer('live-status');
    this.liveStream.startStream();

    setTimeout(()=>{
        this.resetTimer(); // Un-comment this line
    },5000)
  }

  startTimer() {
    this.print.log('Screen Saver Enabled!');
    const duration = this.timeInMintes * 60 * 1000;
    this.print.log('Screen Out Time',duration)
    this.timeOut = setTimeout(()=> {
      this.isScreenSaver = true;
    }, duration)
  }

  resetTimer() {
    clearTimeout(this.timeOut);
    this.print.log('Screen Saver Disabled!');
    this.isScreenSaver = false;
    this.startTimer();
  }

  // @HostListener('document:touchstart')
  // @HostListener('document:touchmove')
  // @HostListener('document:touchend')
  // @HostListener('document:touchcancel')
  @HostListener('document:click')
  handleUserActivity() {
    this.resetTimer();
  }

  getConfiguration() {
    const isExists = this.ss.getItem('_config');

    if(isExists) {
        this.print.log('Configuration Already Exists!');
        return
    }

    this.api.get('configuration', {}).subscribe({
        next: (response:any) => {
            if(response.data) {
                this.ss.setItem('_config', response.data);
                this.print.log('Configuration fetched and Updated in the storage!')
            }
        },
        error: (error:any) => {
            this.print.error('Error happened while fetching data from the Configuration', error);
        }
    })
  }
}
