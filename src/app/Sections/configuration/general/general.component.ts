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

    isTimeEditor:boolean = false;
    isSpeedEditor:boolean = false;

    timerLocations:number[] = [];
    waitingTimer:any;

    robotSetSpeed:number = 0;

    constructor(private readonly ss:SessionStorageService, private readonly api:ApiService, private readonly notification:NotificationService) {
        this.colors = colors;
        this.print = new Print();
    }

    ngOnInit(): void {
        this.fetchUpdatedConfig();
    }

    calculateTime(timeInSeconds:number) {
        let time:any = {
            minutes: 0,
            seconds: 0
        };
        if(timeInSeconds < 59) {
            time['minutes'] = 0;
            time['seconds'] = timeInSeconds;
        }
        else {
            time['minutes'] = Math.trunc(timeInSeconds / 60);
            time['seconds'] = timeInSeconds % 60;
        }

        return time;
    }

    rangeInput(event:any, min:number, max:number, from:string) {
        const value = Number(event.target.value);
        if(from === 'ackTimer') {
            this.calculateTime(value);
        }
        else if(from === 'speed') {
            this.robotSetSpeed = value;
        }
        else {
            const ackTimer = from.split('-');
            if(ackTimer[0] !== 'ackTimer') {
                this.print.log('Invalid Value');
                return
            }
            else {
                this.waitingTimer[ackTimer[1]] = +value;
            }
        }
    }

    private getWaitingTime() {
        return 50
    }

    range(n:number) {
        return new Array(n)
    }

    updateConfigParams(callFor:string) {
        let body:any
        if(callFor === 'ackTimer') {
            body = {waitingTime: this.fillAllLocationsOfWaitingTimer()};
            this.updateConfig(body)
        }
        else if(callFor === 'speed') {
            this.updateSpeed(this.robotSetSpeed);
        }
    }

    private fillAllLocationsOfWaitingTimer() {
        this.timerLocations.forEach((locId:number) => {
            this.waitingTimer[locId] ??= 0;
        })

        return this.waitingTimer;
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
                    this.notification.success('Updated Successfully', 'Configuration updated successfully')
                }
            },
            error: (error:any) => {
                this.print.error('Error happened while fetching data from the Configuration', error);
                this.notification.error('Error Happened', 'Error Happened while updating the configuration');
            }
        });
    }

    async editAckTimer() {
        this.waitingTimer = {...this.configuration?.waitingTime};
        this.timerLocations = await this.fetchLocations();
    }

    generateTime(value:number) {
        const time:any = this.calculateTime(value);
        const minutes = time['minutes'] < 10 ? '0'+time['minutes'] : time['minutes']
        const seconds = time['seconds'] < 10 ? '0'+time['seconds'] : time['seconds']
        return `${minutes}m${seconds}s`
    }

    private fetchLocations():Promise<number[]> {
        return new Promise((resolve, reject) => {
            const locationToBeIgnored = this.ignoreLocations();
            this.api.get('navitrol/location-list', {}).subscribe({
                next: (response:any) => {
                    this.print.log(response);
                    const locations = response.data.filter((data:any) => !locationToBeIgnored.includes(data));
                    this.isTimeEditor = true;
                    resolve(locations)
                },
                error: (error:any) => {
                    this.print.error('Error Happened while fetching locations in ract-select => ',error);
                    resolve([]);
                }
            })
        })
    }

    private ignoreLocations():number[] {
        const ignoredLocations = [];
        // Add charging node to the ignorance list
        ignoredLocations.push(this.configuration?.nodes?.chargingNode);
        return ignoredLocations;

    }
}
