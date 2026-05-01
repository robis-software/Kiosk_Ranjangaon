import { Component, OnInit } from '@angular/core';
import { IconsComponent } from "../../../Components/icons/icons.component";
import { colors } from '../../../Utils/colors';
import { PopupComponent } from "../../../Components/popup/popup.component";
import { CommonModule } from '@angular/common';
import { TitleComponent } from "../../../Components/title/title.component";
import { RouterLink } from "@angular/router";
import { SessionStorageService } from '../../../Services/session-storage.service';
import Print from '../../../Utils/print';
import { ApiService } from '../../../Services/api.service';
import { NotificationService } from '../../../Services/notification.service';

@Component({
  selector: 'ranjangaon-general',
  standalone: true,
  imports: [IconsComponent, PopupComponent, CommonModule, TitleComponent, RouterLink],
  templateUrl: './general.component.html',
  styleUrl: './general.component.css'
})
export class GeneralComponent implements OnInit {
    colors:any;
    print:Print;
    configuration:any;

    waitingTimer:number = 0;

    time:any = {
        minutes: 0,
        seconds: 0
    }

    isTimeEditor:boolean = false;
    isSpeedEditor:boolean = false;

    robotSetSpeed:number = 0;

    constructor(private readonly ss:SessionStorageService, private readonly api:ApiService, private readonly notification:NotificationService) {
        this.colors = colors;
        this.print = new Print();
    }

    ngOnInit(): void {
        this.fetchUpdatedConfig();
    }

    calculateTime(timeInSeconds:number) {
        if(timeInSeconds < 59) {
            this.time['minutes'] = 0;
            this.time['seconds'] = timeInSeconds;
        }
        else {
            this.time['minutes'] = Math.trunc(timeInSeconds / 60);
            this.time['seconds'] = timeInSeconds % 60;
        }
    }

    rangeInput(event:any, min:number, max:number, from:string) {
        const value = Number(event.target.value);
        if(from === 'ackTimer') {
            this.calculateTime(value);
        }
        else if(from === 'speed') {
            this.robotSetSpeed = value;
        }
    }

    private getWaitingTime() {
        return (this.time['minutes'] * 60) + this.time['seconds']
    }

    range(n:number) {
        return new Array(n)
    }

    updateConfigParams(callFor:string) {
        let body:any
        if(callFor === 'ackTimer') {
            body = {waitingTime: this.getWaitingTime()}
            this.updateConfig(body)
        }
        else if(callFor === 'speed') {
            this.updateSpeed(this.robotSetSpeed);
        }
    }

    private updateSpeed(speed:number){
        this.api.post('navitrol/set-speed', {speed}).subscribe({
            next: (response:any) => {
                if(response.data || response?.data?.data) {
                    this.updateConfig({robotSetSpeed: this.robotSetSpeed});
                }
                else {
                    this.notification.error('Error happened!', "Error happened during updating the data")
                }
            },
            error: (error:any) => {
                this.print.error(error);
            }
        })
    }

    private initializeConfig() {
        this.configuration = this.ss.getItem('_config');
        this.waitingTimer = this.configuration?.waitingTime || 0;
        this.robotSetSpeed = this.configuration?.robotSetSpeed || 0;
        this.calculateTime(this.waitingTimer);
    }

    private fetchUpdatedConfig() {
        this.api.get('configuration', {}).subscribe({
            next: (response:any) => {
                if(response.data) {
                    this.configuration = response.data;
                    this.ss.setItem('_config', response.data);
                    this.print.log('Configuration fetched and Updated in the storage!');
                    this.initializeConfig();
                }
            },
                error: (error:any) => {
                this.print.error('Error happened while fetching data from the Configuration', error);
            }
        });
    }

    private updateConfig(body:any) {
        this.api.put('configuration', body, {authorization: 'Bearer Robis-motherson@123'}).subscribe({
            next: (response:any) => {
                if(response.data) {
                    this.configuration = response.data;
                    this.calculateTime(this.configuration?.waitingTime);
                    this.robotSetSpeed = this.configuration?.robotSetSpeed;
                    this.ss.setItem('_config', response.data);
                    this.print.log('Configuration fetched and Updated in the storage!');
                    this.isTimeEditor = false;
                    this.isSpeedEditor = false;
                }
            },
            error: (error:any) => {
                this.print.error('Error happened while fetching data from the Configuration', error);
            }
        });
    }
}
