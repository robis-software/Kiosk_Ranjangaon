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

    constructor(private readonly ss:SessionStorageService, private readonly router:Router, private readonly stream:SseService, private readonly notification:NotificationService){
        this.print = new Print();
        this.colors = colors;
    }

    ngOnInit(): void {
        this.setMode();
        this.stream.serverEvent$.subscribe((data:any)=> {
            this.liveData = data;
            this.robotActionMode = this.ss.getItem('robotMode');
            // this.print.log('From Header =>', this.liveData)
        })
        this.recursiveTry();
    }

    private setMode() {
        const robotMode:number = this.ss.getItem('robotMode');
        if(robotMode === null || robotMode === undefined) {
            this.ss.setItem('robotMode', 1); // => Initially it is set as 1, Manual mode
        }
        else {
            this.robotActionMode = robotMode;
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
        this.ss.setItem('robotMode', mode);
        this.robotActionMode = this.ss.getItem('robotMode');
        this.isChangeModeDialogOpen = false;
        this.print.log('Mode Changed to =>', mode);
    }

}
