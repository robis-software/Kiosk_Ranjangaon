import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IconsComponent } from "../../../Components/icons/icons.component";
import { Router} from "@angular/router";
import Print from '../../../Utils/print';
import { colors } from '../../../Utils/colors';
import { SessionStorageService } from '../../../Services/session-storage.service';
import { SseService } from '../../../Services/sse.service';
import { NotificationService } from '../../../Services/notification.service';
import { PopupComponent } from "../../../Components/popup/popup.component";
import { ApiService } from '../../../Services/api.service';

@Component({
  selector: 'ranjangaon-header',
  standalone: true,
  imports: [CommonModule, IconsComponent, PopupComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})

export class HeaderComponent implements OnInit {
    print!:Print;
    colors:any;

    liveData:any;
    config:any;

    recursiveTimer:any;

    robotActionMode:number = 2; // => 1 -> Auto || 2 -> Manual

    selectedModeToSwitch:number = 0;

    isChangeModeDialogOpen:boolean = false;

    constructor(private readonly ss:SessionStorageService, private readonly router:Router, private readonly stream:SseService, private readonly notification:NotificationService, private readonly api:ApiService){
        this.print = new Print();
        this.colors = colors;
    }

    ngOnInit(): void {
        this.setMode();
        this.stream.serverEvent$.subscribe((data:any)=> {
            this.liveData = data;
            this.robotActionMode = this.currentRobotMode();
            // this.print.log('From Header =>', this.liveData)
        })
        this.recursiveTry();
    }

    private setMode() {
        // Forcing the logic to set the robot to mannaul mode initially
        if(this.currentRobotMode() === 1) {
            this.setRobotMode(2);
        }
        else {
            this.robotActionMode = this.currentRobotMode();
        }
    }

    private recursiveTry() {
        this.config = this.ss.getItem('_config');
        this.print.log('Recursive Trying....');
        if(this.config) {
            clearTimeout(this.recursiveTimer);
        }
        else {
            this.recursiveTimer = setTimeout(()=> {
                this.recursiveTry();
            },100)
        }
    }

    openOptions() {
        const isAuthenicated = this.ss.getItem('_authenication');
        if(isAuthenicated) {
            this.print.log('Already in Options');
        }
        else {
            this.router.navigate(['/authenicate'])
        }
    }

    changeModeDialogOpen(mode:number) {
        if(this.robotActionMode === mode) {
            this.isChangeModeDialogOpen = false;
            this.notification.info('No Change in mode', 'Robot is already in this mode, try with different mode to change')
        }
        else {
            this.isChangeModeDialogOpen = true;
        }
        this.selectedModeToSwitch = mode;
        this.print.log('Current Selected mode:', this.selectedModeToSwitch)
    }

    changeMode(mode:number) {
        this.setRobotMode(mode);
        this.isChangeModeDialogOpen = false;
        this.print.log('Mode Changed to =>', this.robotActionMode);
    }

    private setRobotMode(mode:number) {
        this.api.put('configuration', {robotMode: mode}, {authorization: 'Bearer Robis-motherson@123'}).subscribe({
            next: (response:any) => {
                if(response.data) {
                    this.config = response.data;
                    this.robotActionMode = this.config?.robotMode || 1;
                    this.ss.setItem('_config', response.data);
                    this.print.log('Configuration fetched and Updated in the storage!');
                    this.notification.success('Robot Mode Changed', 'Robot mode changed and updated successfully');
                    this.ss.setItem('_taskList', {});
                    this.print.log('Mode is getting cleared!!')
                }
            },
            error: (error:any) => {
                this.print.error('Error happened while fetching data from the Configuration', error);
                this.notification.error('Something went wrong', 'Error happenned while changing the robot mode.')
            }
        });
    }

    private currentRobotMode():number {
        const config = this.ss.getItem('_config');
        return config?.robotMode || 1;
    }
}
