import { AfterViewInit, Component, OnInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import Print from '../../Utils/print';
import { SessionStorageService } from '../../Services/session-storage.service';
import { ApiService } from '../../Services/api.service';
import { colors } from '../../Utils/colors';
import { CommonModule } from '@angular/common';
import { IconsComponent } from "../../Components/icons/icons.component";
import { CircularIndicatorComponent } from "../../Components/circular-indicator/circular-indicator.component";
import { Router } from '@angular/router';
import { PopupComponent } from "../../Components/popup/popup.component";
import { SseService } from '../../Services/sse.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ranjangaon-dashboard',
  standalone: true,
  imports: [CommonModule, IconsComponent, CircularIndicatorComponent, PopupComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})

export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('rackContainer')rackContainer!:ElementRef<HTMLDivElement>;
    private subscription!:Subscription;
    print!:Print;
    colors:any;

    configuration:any;
    grid:any = {
        rows: 0,
        columns: 0
    }

    racksArray:any[] = []
    liveData:any;

    // Tasks and Realted variales
    taskList:any = {};
    isTaskListSent:boolean = false;

    openForRack:number = 0;

    enableStartButton:boolean = false;

    // Delete Action
    isDeleteAction:boolean = false;
    deleteActionRack:any;

    // Localisation
    isLocalize:boolean = false;
    localisationScoreAtMannual:number = 0;
    localisationStatus:any;

    // Localisation - from live data
    isLocalisationError:boolean = true;

    // Acknowledgement
    isAcknowledgement:boolean = false;


    constructor(private readonly ss:SessionStorageService, private readonly api:ApiService, private readonly router:Router, private readonly liveStream:SseService, private readonly cdf:ChangeDetectorRef) {}

    ngOnInit(): void {
        this.colors = colors;
        this.print = new Print();
        this.monitorStatus();
        this.configuration = this.ss.getItem('_config');
        this.ss.removeItem("_authenication");

        const tasks = this.ss.getItem('_taskList')

        if(tasks === undefined || tasks === null) {
            this.taskList = {}
        }
        else {
            this.taskList = tasks
        }

        // this.generateRacks(this.configuration.racks.rows * this.configuration.racks.columns);
        this.enableStartButton = false;

        this.renderRacks();

        // this.racksArray.forEach((rack:any)=> {
        //     if(this.taskList[rack.id]) {
        //         rack.isLoaded = this.taskList[rack.id].dropLocation !== undefined || this.taskList[rack.id].dropLocation !== null;
        //         rack.dropLocation = this.taskList[rack.id];
        //         this.enableStartButton = true
        //     }
        // });

        this.print.log(this.racksArray);
    }

    ngAfterViewInit(): void {
        this.print.log('Configuration from dashboard!! \n',this.configuration);

        if(this.rackContainer) {
            const rackContRef = this.rackContainer.nativeElement;
            rackContRef.style.gridTemplateRows = `repeat(${this.configuration.racks.rows}, 1fr)`;
            rackContRef.style.gridTemplateColumns = `repeat(${this.configuration.racks.columns}, 1fr)`;
            // this.print.log(rackContRef.style);
        }
    }

    generateRacks(size:number) {
        this.racksArray = [];
        for(let i=0; i< size; i++) {
            const rack = {
                isLoaded: false,
                dropLocation: '',
                id: this.racksArray.length + 1,
            }
            this.racksArray.push(rack)
        }
    }

    renderRacks(from?:string) {

        this.print.log("++++++++++++++++++++++++++++++++++++", from, '++++++++++++++++++++++++++++++++++++')

        const tasks = this.ss.getItem('_taskList')

        if(tasks === undefined || tasks === null) {
            this.taskList = {}
        }
        else {
            this.taskList = tasks
        }

        this.print.log('Tasks Lists =>', this.taskList)

        const taskLocations:any = Object.keys(this.taskList);
        const taskRacks:any = Object.values(this.taskList);

        this.print.log('Render Racks', {taskLocations, taskRacks})

        this.generateRacks(this.configuration.racks.rows * this.configuration.racks.columns);

        taskLocations.forEach((location:number, index:number)=> {
            taskRacks[index].forEach((racks:number) => {
                const currentRack = this.racksArray[racks-1];
                currentRack.isLoaded = true;
                currentRack.dropLocation = location;
                this.racksArray[racks-1] = currentRack;
                this.enableStartButton = true
            })
        })

        this.cdf.detectChanges();

        this.print.log('Updated Racks', this.racksArray)
    }

    sendRackID(rack:any) {
        if(rack.isLoaded) {
            this.print.log('This rack has been filed already!!');
            this.isDeleteAction = true;
            this.deleteActionRack = rack;
            return;
        }
        this.ss.setItem('_taskList', this.taskList)
        this.router.navigate(['/rack-select'], {
            queryParams: {id: rack.id}
        })
    }

    private monitorStatus() {
        this.subscription = this.liveStream.serverEvent$.subscribe((data:any) => {
            this.liveData = data;
            // this.print.log('Response from Dashboard => ', this.liveData);
        })
    }

    deleteAction() {
        // this.taskList[this.deleteActionRackID as number] = null;
        // this.racksArray.forEach((rack:any) => {
        //     if(rack.id === this.deleteActionRackID) {
        //         rack.isLoaded = false;
        //         rack.dropLocation = '';
        //     }
        // })

        // this.print.log('Updated racksArray', this.racksArray)
        // this.print.log('Updated TaskList', this.taskList)

        // this.ss.setItem('_taskList', this.taskList);
        // this.isDeleteAction = false;
        // this.deleteActionRackID = null;

        // ================================================================================================

        // Actual format
        // {
        //    <location_number> : <rack_ids>[]
        // }

        this.taskList[this.deleteActionRack.dropLocation] = this.taskList[this.deleteActionRack.dropLocation].filter((rack:number)=> rack !== this.deleteActionRack.id);

        this.print.log('After Deleted Rack', this.taskList);
        this.ss.setItem('_taskList', this.taskList);
        this.isDeleteAction = false;
        this.deleteActionRack = {};
        this.renderRacks('delete');
        this.checkForTaskAvailable(this.taskList);
    }

    localizeRobot() {
        this.isLocalize = true;
        this.localisationScoreAtMannual = 0;
        this.api.post   ('navitrol/initialize', {id: this.configuration.nodes.localizeNode}).subscribe({
            next: (response:any) => {
                this.localisationScoreAtMannual = 0;
                this.print.log('Fetched Localisation Score', this.localisationScoreAtMannual);
                this.print.log('Initialize API Response', response);
                this.localisationStatus = response.data.status;
                setTimeout(()=> {
                    const incrementer = setInterval(()=>{
                        if(this.localisationScoreAtMannual >= this.liveData.localisation.score) {
                            clearInterval(incrementer);
                            return
                        }
                        this.localisationScoreAtMannual+=1;
                    },50)
                }, 500)
            },
            error: (error:any) => {
                this.print.error('Error happened while fetching data from the localisation', error);
            }
        })
    }

    closeLocalize() {
        this.isLocalize = false;
        this.isLocalisationError = true;
        this.localisationScoreAtMannual = 0;
    }

    sendTask() {
        const taskIds = Object.values(this.taskList);
        const filteredTaskList:number[] = [];
        // for(let id in taskIds) {
        //     if(taskIds[id] !== null && taskIds[id] !== undefined) {
        //         filteredTaskList.push(+taskIds[id]);
        //     }
        // }

        taskIds.forEach((id) => {
            if(id !== null && id !== undefined) {
                filteredTaskList.push(+id)
            }
        })

        // Check whether the filtered task list is not Zero
        if(filteredTaskList.length !== 0) {
            this.print.log('Filtered Task List => SendTask API', filteredTaskList)
            this.sendTaskList(filteredTaskList)
        }
    }

    private sendTaskList(list:number[]) {
        this.print.log('Recieved Task List :=>', list);

        this.api.post('navitrol/create-task', {ids: list}).subscribe({
            next: (res:any) => {
                this.print.log("Create Task API Response", res);
                this.isTaskListSent = true;
            },
            error: (error:any) => {
                this.print.error('Create Task API Error', error);
                this.isTaskListSent = false;
            }
        })
    }

    rotateInplace() {
        this.api.post('navitrol/rotate-180', {}).subscribe({
            next: (res:any) => {
                this.print.log("Rotate 180deg API Response", res);
            },
            error: (error:any) => {
                this.print.error('Create Task API Error', error);
            }
        })
    }

    // ===================================================================================================
    // Helper Function
    // ===================================================================================================
    batteryIndicatorColor(value:number) {
        if(value >= 31) return colors.status.green;
        else if(value >=16) return colors.status.yellow;
        else return colors.status.red;
    }

    localisationScoreColor(value:number) {
        if(value >= 70) return colors.status.green;
        else if(value >=40) return colors.status.yellow;
        else return colors.status.red;
    }

    // Used to check the task list is empty
    private checkForTaskAvailable(list:any) {
        // const listValues = Object.values(list);
        // const lenOfList = listValues.length;

        // // Flag
        // let flag = 0

        // listValues.forEach((listData:any)=> {
        //     if(listData === null || listData === undefined || listData === '') {
        //         flag+=1;
        //         if(flag === lenOfList) {
        //             this.enableStartButton = false;
        //         }
        //     }
        // })

        // flag = 0;

        const racks = Object.values(list);
        let flag = 0;

        racks.forEach((rack:any) => {
            if(rack.length !== 0) {
                flag+=1;
            }
        })

        this.enableStartButton = (flag===0);

    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
