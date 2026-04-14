import { AfterViewInit, Component, OnInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef} from '@angular/core';
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
import { LogsService } from '../../Services/logs.service';

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

    racksArray:any[] = []
    liveData:any;

    // Tasks and Realted variales
    taskList:any = {};
    isTaskListSent:boolean = false;
    skipTaskList:any = {};

    openForRack:number = 0;

    enableStartButton:boolean = false;

    isHomeReached:boolean = false;

    currentPickLocation:number = 0;

    isChargingTaskSent:boolean = false;
    isChargingStationReached:boolean = true;
    isCharging:boolean = false;
    chargeMonitorTimer:any;
    isChargeCompleteAcknowledgement:boolean = false;

    // Delete Action
    isDeleteAction:boolean = false;
    selectedRack:any;

    // Localisation
    isLocalize:boolean = false;
    localisationScoreAtMannual:number = 0;
    localisationStatus:any;

    // Localisation - from live data
    isLocalisationError:boolean = false;

    // Acknowledgement
    isAcknowledgement:boolean = false;
    isAcknowledgementSkip:boolean = false;
    isAcknowledgementGiven:boolean = false;

    // Pick up acknowledgement
    isPickupAcknowledgement:boolean = false;
    isPickupAcknowledgementSkip:boolean = false;
    isPickupAcknowledgementGiven:boolean = false;

    // Acknowledgement Timer
    ackTimer:any;

    // Pickup Acknowledgement Timer
    pickupAckTimer:any;

    timer:number = 0


    // Unload Action
    isUnloadAction:boolean = false;

    isTaskSkipped:boolean = false;


    constructor(private readonly ss:SessionStorageService, private readonly api:ApiService, private readonly router:Router, private readonly liveStream:SseService, private readonly cdf:ChangeDetectorRef, private readonly logs:LogsService) {}

    ngOnInit(): void {
        this.colors = colors;
        this.print = new Print();
        this.configuration = this.ss.getItem('_config');
        this.monitorStatus();
        this.ss.removeItem("_authenication");

        const tasks = this.ss.getItem('_taskList')

        if(tasks === undefined || tasks === null) {
            this.taskList = {}
        }
        else {
            this.taskList = tasks
        }
        this.enableStartButton = false;
        this.renderRacks();
        this.print.log(this.racksArray);
    }

    ngAfterViewInit(): void {
        this.print.log('Configuration from dashboard!! \n',this.configuration);
        this.setPickPoint();
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
            this.isDeleteAction = !this.isTaskListSent;
            this.isUnloadAction = this.isTaskListSent && this.liveData?.currentNode?.status === 13 && this.liveData?.currentNode?.current === +rack.dropLocation;
            this.selectedRack = rack;
            this.print.log('Rack Selected', rack, this.liveData?.currentNode?.current, rack.dropLocation)
            return;
        }
        this.ss.setItem('_taskList', this.taskList)
        if(!this.isTaskListSent) {
            this.router.navigate(['/rack-select'], {
                queryParams: {id: rack.id}
            })
        }
    }

    private monitorStatus() {
        this.subscription = this.liveStream.serverEvent$.subscribe((data:any) => {
            this.liveData = data;

            this.print.log({
                ...data.currentNode
            })

            if(this.liveData?.battery >= this.configuration.battery.max && this.isChargeCompleteAcknowledgement) {
                this.print.log('Robot is charged Enough and sent to the pick location');
                this.isHomeReached = false;
                this.isChargingStationReached = false;
                this.isChargingTaskSent = false;
                this.chargeMonitorTimer = null;
                this.pickLocationTaskAPI(this.configuration?.nodes?.pickNode[0]); //Enable while it is working properly
                return;
            }

            // If the robot reaches the charging location and battery is less that the battery min value, open the charging mode screen, and work on that Dialog

            if(data?.battery <= this.configuration?.battery.min && this.checkForTaskAvailable(this.taskList) && !this.isChargingTaskSent && !this.isTaskListSent) {
                this.chargingTaskAPI();
                return;
            }

            if(data?.currentNode?.current === this.configuration.nodes.chargingNode && data?.currentNode?.status === 13 && !this.isChargingStationReached) {
                this.completeTaskAPI();
                this.isChargingStationReached = true; //It is reached, so that the status of this is changed
                // this.chargeMonitorTimer = setInterval(()=>{this.isChargingAPI()},1000)
                return
            }

            // if(data?.currentNode?.current === this.configuration?.nodes?.pickNode && data?.currentNode?.status === 13 && !this.isHomeReached) {
            if(this.configuration?.nodes?.pickNode.includes(data?.currentNode?.current) && data?.currentNode?.status === 13 && !this.isHomeReached) {
                this.completeTaskAPI();
                if(data?.currentNode?.current === this.configuration?.nodes?.pickNode[0]) {
                    this.setPickPoint();
                }
                this.isHomeReached = true;
                return
            }


            console.log('Start Pick UP timer =>', data?.currentNode?.status === 13 && !this.isTaskListSent && !this.isPickupAcknowledgement && !this.isPickupAcknowledgementGiven && this.configuration?.nodes?.pickNode?.includes(data?.currentNode.current))

            if(data?.currentNode?.status === 13 && !this.isTaskListSent && !this.isPickupAcknowledgement && !this.isPickupAcknowledgementGiven && this.configuration?.nodes?.pickNode?.includes(data?.currentNode.current) && data?.currentNode?.current !== this.configuration?.nodes?.pickNode[0]) {
                this.startPickupAcknowledgementTimer();
                return
            }

            if(data?.currentNode?.status === 13 && this.isTaskListSent && !this.isAcknowledgement && !this.isAcknowledgementGiven) {
                this.startAcknowledgementTimer();
                return
            }

            else if(!this.isLocalisationError && data?.localisation?.error?.code === 207) {
                this.isLocalisationError = true;
                return
            }
            // Check and assign the pick point automatically if the list is empty and check the current node position for it, so that it is easier to check the robot is in pick location
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
        this.print.log(this.selectedRack)
        this.taskList[this.selectedRack.dropLocation] = this.taskList[this.selectedRack.dropLocation].filter((rack:number)=> rack !== this.selectedRack.id);

        this.print.log('After Deleted Rack', this.taskList);
        this.ss.setItem('_taskList', this.taskList);
        this.isDeleteAction = false;
        this.selectedRack = {};
        this.renderRacks('delete');
        this.checkForTaskAvailable(this.taskList);
    }

    localizeRobot() {
        this.isLocalize = true;
        this.localisationScoreAtMannual = 0;
        this.api.post('navitrol/initialize', {id: this.configuration.nodes.localizeNode}).subscribe({
            next: (response:any) => {
                this.localisationScoreAtMannual = 0;
                this.print.log('Fetched Localisation Score', this.localisationScoreAtMannual);
                this.print.log('Initialize API Response', response);
                this.localisationStatus = this.liveData.localisation.code
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
        this.isLocalisationError = false;
        this.localisationScoreAtMannual = 0;
    }

    sendTask() {
        this.taskList = this.ss.getItem('_taskList');
        const taskIds = Object.keys(this.taskList);
        const TotalRacks = this.configuration.racks.rows * this.configuration.racks.columns;
        const filteredTaskList:number[] = [];

        alert('Button Pressed Start');
        console.log("++++++++++++++",this.taskList);

        for(let i=1; i<TotalRacks+1; i++) {
            console.log(this.taskList[i]);
            if(this.taskList[i] !== null && this.taskList[i]?.length !== 0 && this.taskList[i] !== undefined ) {
                filteredTaskList.push(i);
            }
        }


        this.print.log('Values of Task', taskIds);
        this.print.log('filtered logs', filteredTaskList)

        // Check whether the filtered task list is not Zero
        if(filteredTaskList.length !== 0) {
            this.print.log('Filtered Task List => SendTask API', filteredTaskList)
            this.sendTaskList(filteredTaskList);
        }
    }

    sendToNextPickLocation() {
        this.currentPickLocation += 1
        this.pickLocationTaskAPI(this.configuration?.nodes?.pickNode[this.currentPickLocation]);
    }

    unloadAllRacks() {
        this.taskList[this.selectedRack.dropLocation] = this.taskList[this.selectedRack.dropLocation].filter((rack:number)=> rack !== this.selectedRack.id);
        this.ss.setItem('_taskList', this.taskList)
        this.print.log('Updated Task List After Unloading', this.taskList);
        this.renderRacks('delete');
        this.isUnloadAction = false;
        if(this.taskList[this.selectedRack.dropLocation].length === 0) {
            this.completeTaskAPI();
        }
    }

    private sendTaskList(list:number[]) {
        this.print.log('Recieved Task List :=>', list);

        this.api.post('navitrol/create-task', {ids: list}).subscribe({
            next: (res:any) => {
                this.print.log("Create Task API Response", res);
                this.isTaskListSent = true;
                this.isHomeReached = false;
                this.skipTaskList = {};
                this.logs.send(200, 'New Task List sent', list);
            },
            error: (error:any) => {
                this.print.error('Create Task API Error', error);
                this.isTaskListSent = false;
                this.logs.send(400, 'New Task List nog Send', 'Sending Task List API Failure');
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

    // Acknowledgement Timer
    startAcknowledgementTimer() {
        this.timer = this.configuration.waitingTime;
        this.isAcknowledgement = true;
        this.isAcknowledgementSkip = false;
        setTimeout(()=>{
            this.ackTimer = setInterval(()=>{
                if(this.timer <= 0) {
                    clearInterval(this.ackTimer);
                    this.isAcknowledgement = false;
                    this.isAcknowledgementSkip = false;
                    this.clearAcknowledgementTimer();
                    this.skipTask();
                }
                else {
                    this.timer-=1
                }
            }, 1000)
        },100)
    }

    clearAcknowledgementTimer() {
        this.isAcknowledgement = false;
        this.isAcknowledgementSkip = false;
        this.isAcknowledgementGiven = true;
        clearInterval(this.ackTimer);
    }

    skipAckowledgement() {
        this.isAcknowledgementSkip = true;
        clearInterval(this.ackTimer);
    }

    skipTask() {
        if(!this.isTaskSkipped) {
            this.skipTaskList[this.liveData?.currentNode?.current] = this.taskList[this.liveData?.currentNode?.current]
        }
        this.taskList[this.liveData?.currentNode?.current] = undefined;
        this.ss.setItem('_taskList', this.taskList);
        this.renderRacks('delete');
        this.completeTaskAPI();
    }

    // Pickup Acknowledgement Timer
    startPickupAcknowledgementTimer() {
        this.timer = this.configuration.waitingTime;
        this.isPickupAcknowledgement = true;
        this.isPickupAcknowledgementSkip = false;
        setTimeout(()=>{
            this.pickupAckTimer = setInterval(()=>{
                if(this.timer <= 0) {
                    clearInterval(this.pickupAckTimer);
                    this.isPickupAcknowledgement = false;
                    this.isPickupAcknowledgementSkip = false;
                    this.clearPickupAcknowledgementTimer();
                    this.skipThisPickupLocation();
                }
                else {
                    this.timer-=1
                }
            }, 1000)
        },100)
    }

    clearPickupAcknowledgementTimer() {
        this.isPickupAcknowledgement = false;
        this.isPickupAcknowledgementSkip = false;
        this.isPickupAcknowledgementGiven = true;
        clearInterval(this.pickupAckTimer);
    }

    skipPickupAckowledgement() {
        this.isPickupAcknowledgementSkip = true;
        clearInterval(this.pickupAckTimer);
    }

    skipThisPickupLocation() {
        if(this,this.currentPickLocation === this.configuration?.nodes?.pickNode.length - 1) {
            this.sendTask();
            return
        }
        this.sendToNextPickLocation();
    }

    completeTaskAPI() {
        this.api.post('navitrol/complete-task', {}).subscribe({
            next: (response:any) => {
                this.print.log('Task completed in current Node!!', response);
                this.isAcknowledgementGiven = false;
                this.isUnloadAction = false;

                if(this.liveData?.battery <= 35 && this.checkForTaskAvailable(this.taskList) && !this.isChargingTaskSent && !this.isTaskListSent) {
                    this.chargingTaskAPI();
                    return;
                }
                // if(this.liveData?.battery <= this.configuration?.battery?.min && this.checkForTaskAvailable(this.taskList) && !this.isChargingTaskSent && !this.isTaskListSent) {
                //     this.chargingTaskAPI();
                //     return;
                // }

                if(this.checkForTaskAvailable(this.taskList) && !this.checkForTaskAvailable(this.skipTaskList) && !this.isTaskSkipped) {
                    this.logs.send(100, 'Skipped Task List', 'Skipped task list is sent to the robot')
                    this.taskList = {...this.skipTaskList};
                    this.isTaskSkipped = true;
                    this.ss.setItem('_taskList', this.taskList);
                    this.skipTaskList = {};
                    this.renderRacks();
                    this.setPickPoint(this.liveData?.currentNode?.current);
                    this.sendTask();
                }

                // if(this.checkForTaskAvailable(this.taskList) && this.checkForTaskAvailable(this.skipTaskList) && this.liveData?.currentNode?.current !== this.configuration?.nodes?.pickNode && && !this.isChargingTaskSent) {
                if(this.checkForTaskAvailable(this.taskList) && this.checkForTaskAvailable(this.skipTaskList) && this.configuration?.nodes?.pickNode.includes(this.liveData?.currentNode?.current) && !this.isChargingTaskSent && !this.isHomeReached) {
                    this.pickLocationTaskAPI(this.configuration?.nodes?.pickNode[0]);
                }
            },
            error: (error:any) => {
                this.print.error('Error happened while fetching data from the localisation', error);
            }
        })
    }

    private setPickPoint(id?:any) {
        let payload = {}
        let pickId = "";
        if(id) {
            payload = {id};
            pickId = id
        }
        else {
            payload = {id: this.configuration.nodes.pickNode[0]}
            pickId = this.configuration?.nodes?.pickNode[0]
        }

        this.api.post('navitrol/set-pick-location', payload).subscribe({
            next: (response:any) => {
                this.print.log('Pick Location Set to the robot!!', response);
                this.logs.send(200, `Pick Location Set => ${pickId}`, 'Pick Location API Success');
            },
            error: (error:any) => {
                this.print.error('Error happened while sending data to the robot', error);
                this.logs.send(200, `Pick Location not set => ${id}`, 'Pick Location API Failure');
            }
        })
    }

    private chargingTaskAPI() {
        this.print.log('Charging Task has sent');
        const payload = {ids: [this.configuration?.nodes?.chargingNode]}

        this.print.log('Payload send with PickLocation', payload)

        this.api.post('navitrol/create-task', payload).subscribe({
            next: (res:any) => {
                this.isTaskListSent = false;
                this.isChargingTaskSent = true;
                this.print.log("Go to Charging Location API Triggered", res);
                this.logs.send(200, 'Charging API', 'Charging API Call Success');
            },
            error: (error:any) => {
                this.print.error('Charging Location API Error', error);
                this.logs.send(400, 'Charging API', 'Charging API Call Failure')
            }
        })

        this.chargeMonitorTimer = setInterval(()=>{this.isChargingAPI()},1000)
    }

    private isChargingAPI() {
        this.api.get('navitrol/charging-status', {}).subscribe({
            next: (response:any) => {
                this.print.log(response);
                this.isCharging = response.data === 1;
            },
            error: (error:any) => {
                this.print.error('Error Happened while fetching locations in ract-select => ',error)
            }
        })
    }

    private pickLocationTaskAPI(pickLocatioId:any) {
        this.print.log('Pick up Location Task has sent');
        const payload = {ids: [pickLocatioId]}

        this.print.log('Payload send with PickLocation', payload)

        this.api.post('navitrol/create-task', payload).subscribe({
            next: (res:any) => {
                this.isTaskListSent = false;
                this.isChargingTaskSent = false;
                this.isChargingStationReached = false;
                this.isHomeReached = false;
                this.isTaskSkipped = false;

                if(pickLocatioId === this.configuration?.nodes?.pickNode[0]) {
                    this.currentPickLocation = 0;
                }

                this.print.log("Go to Pick Location API Triggered", res);
                this.logs.send(200, 'Pick Location Task API', payload);
            },
            error: (error:any) => {
                this.print.error('Pick Location API Error', error);
                this.logs.send(400, 'Pick Location Task API', 'Pick Location Task API not sent');
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
    /**
     *  Used to Check the task list is empty
     * @param list : Task list
     * @returns boolean
     *
     * true -> if there is no data
     *
     * false -> if there is data
     */
    private checkForTaskAvailable(list:any) {
        const racks = Object.values(list);
        let flag = 0;

        racks.forEach((rack:any) => {
            if(rack.length !== 0) {
                flag+=1;

            }
        })
        this.enableStartButton = (flag !== 0);
        return flag === 0
    }

    // ===================================================================================================
    // Angular Events
    // ===================================================================================================

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
