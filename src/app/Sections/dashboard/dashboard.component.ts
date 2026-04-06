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
import TasksCore from '../../core/tasks.core';
import RobotStateCore from '../../core/robotState.core';

enum RobotState {
    IDLE, // 0
    TASK_CREATED, // 1
    TASK_READY, // 2
    TASK_SENT, // 3
    MOVE_NEXT, // 4
    ARRIVED_PICK, // 5
    ARRIVED_DROP, // 6
    ARRIVED_CHARGE, // 7
    WAITING_ACK, // 8
    DROP_ACK, // 9
    CHARGING_REQUESTED, // 10
    CHARGER_CONNECTED, // 11
    CHARGING, // 12
    CHARGING_COMPLETE_ACK // 13
}

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

    // State Mission Variables;
    state:RobotState = RobotState.IDLE;

    private readonly pickAPI!:TasksCore;
    private readonly chargeAPI!:TasksCore;
    private readonly taskAPI!:TasksCore;

    readonly RobotState = RobotState;

    configuration:any;
    racksArray:any[] = []
    liveData:any;

    // Tasks and Realted variales
    taskList:any = {};
    isTaskListSent:boolean = false;
    skipTaskList:any = {};

    enableStartButton:boolean = false;

    isHomeReached:boolean = false;

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

    // Acknowledgement Timer
    ackTimer:any;
    timer:number = 0

    // Unload Action
    isUnloadAction:boolean = false;


    constructor(private readonly ss:SessionStorageService, private readonly api:ApiService, private readonly router:Router, private readonly liveStream:SseService, private readonly cdf:ChangeDetectorRef, private readonly logs:LogsService) {
        this.chargeAPI = new TasksCore(this.api, this.logs, 'charge');
        this.pickAPI = new TasksCore(this.api, this.logs, 'pick');
        this.taskAPI = new TasksCore(this.api, this.logs, 'task');
    }

    // ===================================================================================================
    // Angular Events
    // ===================================================================================================

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
        }

    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
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

    renderRacks() {
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
            this.isDeleteAction = this.state === RobotState.IDLE;
            this.isUnloadAction = this.state !== RobotState.IDLE && this.liveData?.currentNode?.status === 13 && this.liveData?.currentNode?.current === +rack.dropLocation;
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

    sendTask() {
        const taskIds = Object.values(this.taskList);
        const TotalRacks = this.configuration.racks.rows * this.configuration.racks.columns;
        const filteredTaskList:number[] = [];

        for(let i=1; i<TotalRacks+1; i++) {
            if(this.taskList[i] !== null && this.taskList[i]?.length !== 0 && this.taskList[i] !== undefined ) {
                filteredTaskList.push(i);
            }
        }
        this.print.log('Values of Task', taskIds)

        // Check whether the filtered task list is not Zero
        if(filteredTaskList.length !== 0) {
            this.print.log('Filtered Task List => SendTask API', filteredTaskList)
            this.sendTaskList(filteredTaskList);
        }
    }

    private sendTaskList(list:number[]) {
        this.state = RobotState.TASK_READY;
        this.stateMission(this.liveData);
    }

    private monitorStatus() {
        this.subscription = this.liveStream.serverEvent$.subscribe(async(data:any) => {
            this.liveData = data;
            this.print.log({...data.currentNode});
            this.stateMission(data);
            // Check and assign the pick point automatically if the list is empty and check the current node position for it, so that it is easier to check the robot is in pick location
            // this.print.log('Response from Dashboard => ', this.liveData);
        })
    }

    deleteAction() {
        this.print.log(this.selectedRack)
        this.taskList[this.selectedRack.dropLocation] = this.taskList[this.selectedRack.dropLocation].filter((rack:number)=> rack !== this.selectedRack.id);

        this.print.log('After Deleted Rack', this.taskList);
        this.ss.setItem('_taskList', this.taskList);
        this.isDeleteAction = false;
        this.selectedRack = {};
        this.renderRacks();
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

    unloadAllRacks() {
        this.taskList[this.selectedRack.dropLocation] = this.taskList[this.selectedRack.dropLocation].filter((rack:number)=> rack !== this.selectedRack.id);
        this.ss.setItem('_taskList', this.taskList)
        this.print.log('Updated Task List After Unloading', this.taskList);
        this.renderRacks();
        this.isUnloadAction = false;
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
        this.skipTaskList[this.liveData?.currentNode?.current] = this.taskList[this.liveData?.currentNode?.current]
        this.taskList[this.liveData?.currentNode?.current] = undefined;
        this.ss.setItem('_taskList', this.taskList);
        this.renderRacks();
        this.setState(RobotState.DROP_ACK);
        this.stateMission(this.liveData);
    }

    private setPickPoint(id?:any) {
        let payload = {}
        let pickId = "";
        if(id) {
            payload = {id};
            pickId = id
        }
        else {
            payload = {id: this.configuration.nodes.pickNode}
            pickId = this.configuration?.nodes?.pickNode
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

    private isTaskListEmpty(list:any) {
        const racks = Object.values(list);
        let flag = 0;

        racks.forEach((rack:any) => {
            if(rack.length !== 0) {
                flag+=1;
            }
        })
        return flag === 0
    }

    private isReachedDropLocation(data:any): boolean {
        const list = [this.configuration?.nodes?.pickNode, this.configuration?.nodes?.chargingNode]
        return !list.includes(data?.currentNode?.current) && data?.currentNode?.status === 13
    }

    private isReachedPickLocation(data:any): boolean {
        return data?.currentNode?.current === this.configuration?.nodes?.pickNode && data.currentNode?.status === 13
    }

    private isReachedChargeLocation(data:any): boolean {
        return data?.currentNode?.current === this.configuration?.nodes?.chargingNode && data.currentNode?.status === 13
    }

    private isBatteryNeedsCharge(data:any): boolean {
        return data?.battery <= this.configuration?.battery?.min && this.isTaskListEmpty(this.taskList)
    }

    private isAllUnloaded(locationId:number):boolean {
        this.taskList[this.selectedRack.dropLocation] = this.taskList[this.selectedRack.dropLocation].filter((rack:number)=> rack !== this.selectedRack.id);
        this.ss.setItem('_taskList', this.taskList);
        if(this.taskList[this.selectedRack.dropLocation].length === 0) {
            this.renderRacks();
            return true
        }
        return false
    }

    private isChargerConnected():Promise<boolean> {
        return new Promise((resolve, reject)=> {
            this.api.get('navitrol/charging-status', {}).subscribe({
                next: (response:any) => {
                    resolve(response.data === 1);
                },
                error: (error:any) => {
                    this.print.error('Error Happened while fetching locations in ract-select => ',error);
                    resolve(false);
                }
            })
        })
    }

    // Use this in to bring the acknowledgement button in charging screen and press the button to change state to RobotState.CHARGING_COMPLETE_ACK
    isBatteryFullyCharged(data:any): boolean {
        return data?.battery >= this.configuration?.battery?.max
    }

    private setState(newState:RobotState) {
        this.print.log(`State Changed from ${this.state} -> ${newState}`);
        this.state = newState;
    }

    private async stateMission(data:any) {
        switch(this.state) {
            case RobotState.IDLE:
                if(this.isBatteryNeedsCharge(data)) {
                    this.setState(RobotState.CHARGING_REQUESTED);
                    break;
                }

                if(this.isTaskListEmpty(this.taskList)) {
                    this.setState(RobotState.IDLE);
                }
                else {
                    // Set Pick Location to the Robot
                    this.setState(RobotState.TASK_CREATED);
                    // If state = RobotState.TASK_CREATED, then the start button need to be on the screen and that fixes the RobotState.TASK_READY
                }
                break;

            case RobotState.TASK_READY:
                if(await this.taskAPI.createTask(this.taskList)) {
                    this.setState(RobotState.TASK_SENT);
                    break;
                }
                this.print.log('Task List not sent to robot!!')
                this.setState(RobotState.TASK_CREATED);
                break;

            case RobotState.CHARGING_REQUESTED:
                if(await this.chargeAPI.createTask([this.configuration?.nodes?.chargingNode])) {
                    this.setState(RobotState.TASK_SENT);
                }
                else {
                    this.setState(RobotState.IDLE);
                }
                break;

            case RobotState.TASK_SENT:
                if(this.isReachedDropLocation(data)) {
                    this.setState(RobotState.ARRIVED_DROP);
                }
                else if(this.isReachedPickLocation(data)) {
                    this.setState(RobotState.ARRIVED_PICK);
                }
                else if(this.isReachedChargeLocation(data)) {
                    this.setState(RobotState.ARRIVED_CHARGE);
                }
                break;

            case RobotState.ARRIVED_PICK:
                if(await this.pickAPI.completeTask(this.configuration?.nodes?.pickNode)) {
                    // Set Pick refernce point for upcoming tasks
                    this.setState(RobotState.IDLE);
                }
                else {
                    this.setState(RobotState.TASK_SENT);
                }
                break;

            case RobotState.ARRIVED_DROP:
                this.setState(RobotState.WAITING_ACK);
                this.startAcknowledgementTimer();
                break

            // This will be given in the Ack button of the drop location reached acknowledgement Screen
            case RobotState.DROP_ACK:
                this,this.isUnloadAction = false;
                if(this.isAllUnloaded(data?.currentNode?.current)) {
                    this.setState(RobotState.MOVE_NEXT);
                }
                break;

            case RobotState.MOVE_NEXT:
                if(await this.taskAPI.completeTask(data?.currentNode?.current)) {
                    this.setState(RobotState.TASK_SENT)
                }

                if(this.isTaskListEmpty(this.taskList)) {
                    await this.pickAPI.createTask([this.configuration?.nodes?.pickNode]);
                    this.setState(RobotState.TASK_SENT);
                }
                break;

            case RobotState.ARRIVED_CHARGE:
                if(await this.chargeAPI.completeTask(this.configuration?.nodes?.chargingNode)) {
                    this.setState(RobotState.CHARGER_CONNECTED);
                }
                break;

            case RobotState.CHARGER_CONNECTED:
                if(await this.isChargerConnected()) {
                    this.setState(RobotState.CHARGING);
                    // If the battery is fully charged an button will be shown in the UI to change state to RobotState.CHARGING_COMPLETE_ACK
                }
                break;

            case RobotState.CHARGING_COMPLETE_ACK:
                if(await this.pickAPI.createTask([this.configuration?.nodes?.pickNode])) {
                    this.setState(RobotState.TASK_SENT);
                }
                break;
        }

    }
}
