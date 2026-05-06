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
            next: async(response:any) => {
                if(response.data) {
                    this.config = response.data;
                    this.robotActionMode = this.config?.robotMode || 1;
                    this.ss.setItem('_config', response.data);
                    this.print.log('Configuration fetched and Updated in the storage!');
                    this.notification.success('Robot Mode Changed', 'Robot mode changed and updated successfully');
                    // this.ss.setItem('_taskList', {});
                    await this.setTaskListBasedOnMode(this.robotActionMode);
                    this.print.log('Mode is getting cleared!!')
                }
            },
            error: (error:any) => {
                this.print.error('Error happened while fetching data from the Configuration', error);
                this.notification.error('Something went wrong', 'Error happenned while changing the robot mode.')
            }
        });
    }

    async setTaskListBasedOnMode(mode:number) {
        if(mode === 1) {
            const taskList = this.fetchTaskListFromSS();
            if(this.isTaskListEmpty(taskList) && this.currentRobotMode() === 1) {
                console.log('Assgin new Drop Sequence to ss')
                await this.generateAutoModeDropSequence();
            }
        }
        else if(mode === 2) {
            this.ss.setItem('_taskList', {});
        }
    }

    private currentRobotMode():number {
        const config = this.ss.getItem('_config');
        return config?.robotMode || 1;
    }


    // Utils for setTaskListBasedOnMode()
    // private async preloadAutoModeDropSequence():Promise<void> {
    //     this.autoModeDropSequence = await this.generateAutoModeDropSequence();
    //     this.print.log("Preload Auto Seqeunce",this.autoModeDropSequence);
    // }

    private async generateAutoModeDropSequence(){
        const dropLocations = await this.fetchLocations();
        this.config?.sequence?.drop.forEach((location:number) => {
            if(dropLocations.includes(location)) {
                this.addTask(+location);
            }
            else {
                this.print.error('Location that is configured is not available in the drop location list from the robot, check')
            }
        });

        return this.ss.getItem('_taskList') ?? {}
    }

    private fetchLocations():Promise<number[]> {
        return new Promise((resolve, reject) => {
            const locationToBeIgnored = this.ignoreLocations();
            this.api.get('navitrol/location-list', {}).subscribe({
                next: (response:any) => {
                    this.print.log(response);
                    const locations = response.data.filter((data:any) => !locationToBeIgnored.includes(data));
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
        const lenOfPickNodeList = this.config?.nodes?.pickNode.length;

        // Pick Nodes added to the ignorance list
        for(let i=0; i<lenOfPickNodeList; i++) {
            ignoredLocations.push(this.config?.nodes?.pickNode[i])
        }

        // Add charging node to the ignorance list
        ignoredLocations.push(this.config?.nodes?.chargingNode, this.config?.nodes?.homeNode);
        return ignoredLocations;

    }

    private addTask(id:number) {
        // Step 1: Check whether there is Location entered
        let temp = this.fetchTaskListFromSS();
        this.print.log('Current Task List -> Auto', temp);
        temp[+id] = [0];
        this.print.log({locations: Object.keys(temp), racks: Object.values(temp)});
        this.ss.setItem('_taskList', temp);
    }

    private fetchTaskListFromSS():any {
        let tasks:any;

        // if(this.currentRobotMode() === 2) {
        //     tasks = this.ss.getItem('_taskList');
        // }
        // else if(this.currentRobotMode() === 1) {
        //     tasks = this.autoModeDropSequence;
        //     this.print.log("Auto Sequence",tasks)
        // }

        tasks = this.ss.getItem('_taskList');

        if(tasks === undefined || tasks === null) {
            return {}
        }
        else {
            return tasks
        }
    }

    /**
     * Used to check that the task list is empty or not
     * @param list : Task List
     * @returns boolean
     */
    private isTaskListEmpty(list:any):boolean {
        const racks = Object.values(list);

        if(racks.length === 0) {
            return true
        }

        let flag = 0;

        racks.forEach((rack:any) => {
            if(rack.length !== 0) {
                flag+=1;
            }
        })
        return flag === 0
    }
}
