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
import { PopupComponent } from "../Components/popup/popup.component";
import { IconsComponent } from "../Components/icons/icons.component";
import { colors } from '../Utils/colors';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ScreenSaverComponent, LayoutComponent, PopupComponent, IconsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  isScreenSaver:boolean = true; //Change to true
  isReadyToOpen: boolean = true;
  timeOut:any;
  print!:Print;
  configuration:any;
  colors:any;
  liveData:any;

  timeInMintes = environment.screenTimeOut;

  isBatteryLow:boolean = false

  constructor(private readonly api:ApiService, private readonly ss:SessionStorageService, private readonly router:Router, private readonly liveStream:SseService) {}

    ngOnInit(): void {
        this.print = new Print();
        this.colors = colors;
        this.getConfiguration();
        this.liveStream.Initializer('live-status');
        this.liveStream.startStream();
        this.monitorStatus();

        setTimeout(()=>{
            this.resetTimer(); // Un-comment this line
        },5000);
    }

    private monitorStatus() {
        this.liveStream.serverEvent$.subscribe((data:any) => {
            this.liveData = data;
            // this.print.log('Live-status=> \n', data);
            const isEmpty = !data || Object.keys(data).length === 0;
            const isNotLive = data?.live === false;
            if((isEmpty || isNotLive) && this.router.url !== '/disconnected') {
                // this.router.navigateByUrl('/disconnected');
            }

            if(this.configuration?.battery.min > this.liveData?.battery) {
                this.isBatteryLow = true;
                this.chargingTaskAPI();
            }
        });
    }

    startTimer() {
        this.print.log('Screen Saver Enabled!');
        const duration = this.timeInMintes * 60 * 1000;
        this.print.log('Screen Out Time',duration);
        this.timeOut = setTimeout(()=> {
            this.isScreenSaver = true;
        }, duration);
    }

    resetTimer() {
        clearTimeout(this.timeOut);
        this.print.log('Screen Saver Disabled!');
        this.isScreenSaver = false;
        this.startTimer();
    }

    @HostListener('document:touchstart')
    @HostListener('document:touchmove')
    //   @HostListener('document:touchend')
    //   @HostListener('document:touchcancel')
    @HostListener('document:click')
    handleUserActivity() {
        this.resetTimer();
    }

    getConfiguration() {
        const isExists = this.ss.getItem('_config');

        if(isExists) {
            this.configuration = isExists;
            this.print.log('Configuration Already Exists!');
            return;
        }

        this.api.get('configuration', {}).subscribe({
            next: (response:any) => {
                if(response.data) {
                    this.configuration = response.data;
                    this.ss.setItem('_config', response.data);
                    this.print.log('Configuration fetched and Updated in the storage!');
                }
            },
            error: (error:any) => {
                this.print.error('Error happened while fetching data from the Configuration', error);
            }
        });
    }

    chargingTaskAPI() {
        this.print.log('Charging Station Task is sent!!');
    }
}
