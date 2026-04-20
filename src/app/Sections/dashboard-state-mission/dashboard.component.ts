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
import { config, Subscription } from 'rxjs';
import { LogsService } from '../../Services/logs.service';
import TasksCore from '../../core/tasks.core';
import { NotificationService } from '../../Services/notification.service';

enum RobotState {
    IDLE, // 0
    TASK_READY, // 1
    TASK_SENT, // 2
    MOVE_NEXT_DROP, // 3
    MOVE_NEXT_PICK, // 4
    ARRIVED_PICK, // 5
    ARRIVED_DROP, // 6
    ARRIVED_CHARGE, // 7
    WAITING_DROP_ACK, // 8
    WAITING_PICK_ACK, // 9
    DROP_ACK, // 10
    PICK_ACK, // 11
    CHARGING_REQUESTED, // 12
    CHARGER_CONNECTED, // 13
    CHARGING, // 14
    CHARGING_COMPLETE_ACK // 15
}

interface Ack {
    timerRef: any,
    given: boolean,
    skip: boolean
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

    // Actions
    private readonly pickAPI!:TasksCore;
    private readonly chargeAPI!:TasksCore;
    private readonly taskAPI!:TasksCore;

    private readonly stateOfRobot = {
        0:  "IDLE", // 0
        1:  "TASK_READY", // 1
        2:  "TASK_SENT", // 2
        3:  "MOVE_NEXT_DROP", // 3
        4:  "MOVE_NEXT_PICK", // 4
        5:  "ARRIVED_PICK", // 5
        6:  "ARRIVED_DROP", // 6
        7:  "ARRIVED_CHARGE", // 7
        8:  "WAITING_DROP_ACK", // 8
        9:  "WAITING_PICK_ACK", // 9
        10: "DROP_ACK", // 10
        11: "PICK_ACK", // 11
        12: "CHARGING_REQUESTED", // 12
        13: "CHARGER_CONNECTED", // 13
        14: "CHARGING", // 14
        15: "CHARGING_COMPLETE_ACK" // 15
    }

    // General Parameters
    colors:any;
    print!:Print;
    configuration:any;
    type:'IDLE' | 'PICK' | 'DROP' = "IDLE";

    // Live parameters
    liveData:any;

    // Racks
    racksArray:any[] = [];
    selectedRack:any;

    // Task list Parameters
    createdTaskList:any = {};
    skippedTaskList:any = {};
    taskList:number[] = [];
    isTaskListSent:boolean = false;

    // Robot State
    currentState!:RobotState;
    robotState = RobotState;

    // Dialog Parameters
    isDeleteAction:boolean = false;
    isUnloadAction:boolean = false;

    // Localisation
    localisationScore:number = 0;
    localisationStatus:number = 0;
    isLocaliseDialogOpen:boolean = false;

    // Home Location parameters
    isHomeReached:boolean = false;

    // Pick Location
    pickLocationVisitedCount:number = -1;
    pickLocations:any = [];

    // Charging Location Parameters - Focus On this parameters and play
      charging:Record<string, any> = {
        reached: false,
        taskSent:false,
        disconnectedAckGiven: false,
    }

    // Task List sent boolean
    isPickTaskSent:boolean = false;
    isDropTaskSent:boolean = false;

    // Transitions
    transition = {
        prevNode: 0,
        currentNode: 0
    }

    constructor(private readonly ss:SessionStorageService, private readonly api:ApiService, private readonly router:Router, private readonly liveStream:SseService, private readonly cdf:ChangeDetectorRef, private readonly logs:LogsService, private readonly notification:NotificationService) {
        this.chargeAPI = new TasksCore(this.api, this.logs, 'Charge');
        this.pickAPI = new TasksCore(this.api, this.logs, 'Pick');
        this.taskAPI = new TasksCore(this.api, this.logs, 'Drop');
    }


    // ===================================================================================================
    // Angular Events
    // ===================================================================================================

    ngOnInit(): void {
        this.colors = colors;
        this.print = new Print();
        this.currentState = this.ss.getItem('_currentState') | RobotState.IDLE;
        this.configuration = this.ss.getItem('_config') ?? null;

        if(!this.configuration) {
            this.print.log('No Configuration is there to use!')
            return
        }

        this.monitorStatus();
        this.ss.removeItem("_authenication");
        this.createdTaskList = this.fetchTaskListFromSS();
        this.renderRacks();

        this.dropLocationAck['given'] = this.ss.getItem('_dropAck') === null ? false : this.ss.getItem('_dropAck');
        this.pickLocationAck['given'] = this.ss.getItem('_pickAck') === null ? false : this.ss.getItem('_pickAck');
    }

    ngAfterViewInit(): void {
        this.print.log('Configuration from dashboard!! \n',this.configuration);
        if(this.rackContainer) {
            const rackContRef = this.rackContainer.nativeElement;
            rackContRef.style.gridTemplateRows = `repeat(${this.configuration.racks.rows}, 1fr)`;
            rackContRef.style.gridTemplateColumns = `repeat(${this.configuration.racks.columns}, 1fr)`;
        }
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    // ===================================================================================================
    // Racks Generation based Function
    // ===================================================================================================

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
        this.createdTaskList = this.fetchTaskListFromSS();
        this.print.log('Tasks Lists =>', this.createdTaskList)
        const taskLocations:any = Object.keys(this.createdTaskList);
        const taskRacks:any = Object.values(this.createdTaskList);
        this.generateRacks(this.configuration.racks.rows * this.configuration.racks.columns);
        taskLocations.forEach((location:number, index:number)=> {
            taskRacks[index].forEach((racks:number) => {
                const currentRack = this.racksArray[racks-1];
                currentRack.isLoaded = true;
                currentRack.dropLocation = location;
                this.racksArray[racks-1] = currentRack;
            })
        })

        this.cdf.detectChanges();
        this.taskList = this.getAllTheLocationsFromRawData(this.createdTaskList);
        this.print.log('Updated Racks', this.racksArray)
    }

    // ===================================================================================================
    // Live Monitor Status
    // ===================================================================================================

    private monitorStatus() {
        this.pickLocations = this.ss.getItem('_pickLocation') ?? [];
        // console.log(this.pickLocations);

        // // This logic initially send the pick tasks to the robot, but it need to be implemented in IDLE state - For better understanding and better code quality
        // if(this.pickLocations && this.pickLocations.length !== 0) {
        //     this.pickLocations = this.ss.getItem('_pickLocation');
        //     this.print.log('Pick Location Already Exists =>', this.pickLocations);
        //     this.isPickTaskSent = true;
        //     this.isDropTaskSent = false;
        // }
        // else {
        //     this.pickLocations = this.generatePickLocations();
        //     this.print.log('Pick Location were generated =>', this.pickLocations);
        //     this.ss.setItem('_pickLocation', this.pickLocations);
        //     this.pickLocations = this.generatePickLocations();
        //     this.sendPickTasksToRobot(this.pickLocations);
        //     this.setRefencePoint();
        // }

        this.subscription = this.liveStream.serverEvent$.subscribe(async(data:any) => {
            if(data?.live) {
                this.liveData = data;
                this.print.log(data?.currentNode);
            }
            else {
                this.print.log('Server Offline and no data is coming form navitrol')
            }
            await this.stateMachine(data);
            this.localisationStatus = data?.localisation?.error?.code;
        });
    }

    // ===================================================================================================
    // State Mission and Its Function
    // ===================================================================================================

    setStateFromUI(newState:RobotState) {
        this.setState(newState);
    }

    private setState(newState:RobotState) {
        this.print.log(`Transistion Happened from ${this.stateOfRobot[this.currentState]} => ${this.stateOfRobot[newState]} > [${this.currentState} => ${newState}]`);
        this.currentState = newState;
        this.ss.setItem('_currentState', this.currentState);
    }

    private async stateMachine(data:any) {
        const nodes:any = this.configuration?.nodes
        switch(this.currentState) {
            case RobotState.IDLE:
                this.setType('IDLE');
                this.setRefencePoint();
                this.dropLocationAck['given'] = false;
                this.pickLocationAck['given'] = false;

                this.ss.setItem('_dropAck', this.dropLocationAck['given']);
                this.ss.setItem('_pickAck', this.pickLocationAck['given']);

                this.pickLocations = this.ss.getItem('_pickLocation') ?? [];

                if(this.localisationStatus === 207) {
                    break;
                }
                else if(await this.isChargerConnected()) {
                    this.setState(RobotState.CHARGER_CONNECTED);
                }
                else if(this.isBatteryFullyCharged(data) && this.charging['disconnectedAckGiven']) {
                    this.setState(
                        await this.taskAPI.createTask([nodes?.homeNode])
                        ? RobotState.TASK_SENT
                        : RobotState.IDLE
                    )
                    this.isPickTaskSent = false;
                    this.isDropTaskSent = false;
                    this.charging['disconnectedAckGiven'] = false
                }
                else if(this.isBatteryNeedsCharge(data)) {
                    this.setState(RobotState.CHARGING_REQUESTED);
                    this.isPickTaskSent = false;
                    this.isDropTaskSent = false;
                }
                // else {
                //     const nodes = this.generatePickLocations();
                //     this.sendPickTasksToRobot(nodes);
                // }
                // Pick task initialization — guarded by session storage
                // If pickLocations exists in SS, tasks were already sent (even across reloads)
                else if(!this.pickLocations || this.pickLocations.length === 0) {
                    this.pickLocations = this.generatePickLocations();
                    this.ss.setItem('_pickLocation', this.pickLocations);
                    this.sendPickTasksToRobot(this.pickLocations);
                    this.setRefencePoint();
                    this.isPickTaskSent = true;
                    this.isDropTaskSent = false;
                }
                break;

            case RobotState.TASK_READY:
                if(await this.taskAPI.createTask(this.taskList)) {
                    this.setState(RobotState.TASK_SENT);
                    this.charging['taskSent'] = false;
                    break;
                }
                this.print.log('Task List not sent to robot!')
                this.setState(RobotState.IDLE);
                break;

            case RobotState.CHARGING_REQUESTED:
                if(await this.chargeAPI.createTask([nodes?.chargingNode])) {
                    this.setState(RobotState.TASK_SENT);
                    this.charging['taskSent'] = true;
                }
                else {
                    this.setState(RobotState.IDLE);
                }
                break;

            case RobotState.TASK_SENT:
                if(this.isReachedDropLocation(data)) {
                    this.setState(RobotState.ARRIVED_DROP);
                    this.charging['reached'] = false;
                    this.dropLocationAck['given'] = false;
                    this.ss.setItem('_dropAck', this.dropLocationAck['given']);
                }
                else if(this.isReachedPickLocation(data)) {
                    this.setState(RobotState.ARRIVED_PICK);
                    this.charging['reached'] = false;
                    this.pickLocationAck['given'] = false;
                    this.ss.setItem('_pickAck', this.pickLocationAck['given']);

                }
                else if(this.isReachedChargeLocation(data) && this.type === 'IDLE') {
                    this.setState(RobotState.ARRIVED_CHARGE);
                    this.charging['reached'] = true;
                }
                break;

            case RobotState.ARRIVED_PICK:
                const condition = data?.currentNode?.current === nodes?.homeNode;

                if(!condition) {
                    this.print.log('Pick location ACK is Set False', this.pickLocationAck['given']);
                    this.setState(RobotState.WAITING_PICK_ACK);
                    this.startAcknowledgementTimer();
                    this.setType('PICK');
                }
                else if(condition && !this.isPickTaskSent) {
                    // This will be only triggered, when the robot gets home location task
                    if(await this.taskAPI.completeTask(data?.currentNode?.current)) {
                        this.print.log('Task Completed Automatically in the location =>', data?.currentNode.current);
                        this.setState(RobotState.IDLE);
                        this.setRefencePoint();
                        return;
                    }

                    this.setState(RobotState.PICK_ACK);
                }
                break

            case RobotState.WAITING_PICK_ACK:
            case RobotState.WAITING_DROP_ACK:
                // This is for an edge case
                // some times the Waiting_PICK_ACK is got stuck
                const dropAck = this.ss.getItem('_dropAck');
                const pickAck = this.ss.getItem('_pickAck');

                console.log({drop: dropAck, pick: pickAck});

                if(data?.currentNode?.current === this.configuration?.nodes?.homeNode) {
                    this.setState(RobotState.IDLE);
                }

                if(pickAck && this.type === 'PICK') {
                    this.pickLocationAck['given'] = true;
                    clearInterval(this.pickLocationAck['timerRef']);
                    return;
                }

                if(dropAck && this.type === 'DROP') {
                    this.dropLocationAck['given'] = true;
                    clearInterval(this.pickLocationAck['timerRef']);
                    return;
                }
                break

            case RobotState.ARRIVED_DROP:
                console.log('Drop location ACK is Set False', this.dropLocationAck['given']);
                this.setState(RobotState.WAITING_DROP_ACK);
                this.startAcknowledgementTimer();
                break

            case RobotState.DROP_ACK:
                this.isUnloadAction = false;
                if(this.isAllUnloaded(data?.currentNode?.current)) {
                    this.setState(RobotState.MOVE_NEXT_DROP);
                }
                else {
                    this.setState(RobotState.WAITING_DROP_ACK);
                }
                break;

            case RobotState.PICK_ACK:
                this.setState(RobotState.MOVE_NEXT_PICK)
                break;

            case RobotState.MOVE_NEXT_DROP:
                if(this.isTaskListEmpty(this.createdTaskList)) {
                    this.taskAPI.completeTask(data?.currentNode?.current);
                    if(this.checkForSkippedTask()) {
                        // Checks is there any task skipped
                        // Idf there is task, the taskList is swapped with skipped task list and it is stored
                        this.setRefencePoint(data?.currentNode?.current);
                        this.isTaskSkipped = true;
                        this.setType('DROP');
                        this.setState(RobotState.TASK_READY);
                        this.renderRacks();
                        break;
                    }
                    await this.taskAPI.createTask([nodes?.homeNode]); // Consider it as a normal homeNode Task and not as pick task
                    this.setType('IDLE');
                    this.isPickTaskSent = false;
                    this.isDropTaskSent = false;
                    this.setRefencePoint();
                    this.setState(RobotState.TASK_SENT);
                }
                else if(await this.taskAPI.completeTask(data?.currentNode?.current)) {
                    this.setState(RobotState.TASK_SENT)
                }

                break;

            case RobotState.MOVE_NEXT_PICK:
                this.print.log('Moving to Next Pick Location');
                if(await this.pickAPI.completeTask(data?.currentNode?.current)) {

                    this.pickLocations = this.pickLocations.filter((location:any) => +data?.currentNode?.current !== location);
                    this.ss.setItem('_pickLocation', this.pickLocations);

                    if(this.pickLocations.length === 0){
                        this.pickAPI.completeTask(this.liveData?.currentNode?.current);

                        this.createdTaskList = this.fetchTaskListFromSS();
                        // This is checked when there is no empty task list
                        if(this.isTaskListEmpty(this.createdTaskList) ) {
                            await this.taskAPI.createTask([nodes?.homeNode]); // Consider it as a normal homeNode Task and not as pick task
                            this.setType('IDLE');
                            this.isPickTaskSent = false;
                            this.isDropTaskSent = false;
                            this.setState(RobotState.TASK_SENT);
                        }
                        else {
                            this.print.log('Sending Drop Task');
                            this.sendTaskToTheRobot()
                        }
                        return
                    }
                    // this.ss.setItem('_pickLocationVisitedCount', this.pickLocationVisitedCount)
                    this.setState(RobotState.TASK_SENT);
                }
                break;

            case RobotState.ARRIVED_CHARGE:
                if(await this.chargeAPI.completeTask(this.configuration?.nodes?.chargingNode)) {
                    this.charging['reached'] = true;
                    this.setState(RobotState.CHARGER_CONNECTED);
                }
                this.charging['disconnectedAckGiven'] = false
                break;

            case RobotState.CHARGER_CONNECTED:
                if(await this.isChargerConnected()) {
                    this.setState(RobotState.CHARGING);
                    // If the battery is fully charged an button will be shown in the UI to change state to RobotState.CHARGING_COMPLETE_ACK
                }
                this.charging['disconnectedAckGiven'] = false
                break;

            case RobotState.CHARGING:
                if(this.isBatteryFullyCharged(data)) {
                    this.print.log('Battery full — waiting for charger disconnect acknowledgement');
                }
                break;

            case RobotState.CHARGING_COMPLETE_ACK:
                if(await this.isChargerConnected()) {
                    // If the battery is still charging then, Acknowledgement should to be cancelled
                    this.notification.warn('Warning', 'Still Robot is connected with charger, unplug it and acknowledge');
                    break;
                }

                if(await this.taskAPI.createTask([nodes?.homeNode])) {
                    this.charging['disconnectedAckGiven'] = true
                    this.isPickTaskSent = false;
                    this.isDropTaskSent = false;
                    this.charging['reached'] = false;
                    this.charging['taskSent'] = false;

                    this.setState(RobotState.TASK_SENT);
                    this.setType('IDLE');
                }
                else {
                    this.setState(RobotState.CHARGING_COMPLETE_ACK);
                }
                break;
        }

    }

    // ===================================================================================================
    // Functional APIs
    // 1. In-place rotation API
    // 2. SendTaskToTheRobot
    // ===================================================================================================

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

    async sendTaskToTheRobot() {
        this.createdTaskList = this.fetchTaskListFromSS();
        this.taskList = this.getAllTheLocationsFromRawData(this.createdTaskList);
        if(this.taskList.length !== 0) {
            this.isPickTaskSent = false;
            this.isDropTaskSent = true;
            this.setType('DROP');
            this.setState(RobotState.TASK_READY);
            await this.stateMachine(this.liveData);
        }
    }

    // ===================================================================================================
    // Pick Location and Its function
    // ===================================================================================================

    /**
     * If the list size is 1, it make the state to IDLE and if the size is more, list is sent to robot and change the Status to TASK_SENT
     */
    async sendPickTasksToRobot(nodes:number[]){
        if(!this.isPickTaskSent) {
            if(await this.pickAPI.createTask(nodes)) {
                this.setType('PICK')
                this.pickLocations = [...nodes];
                this.ss.setItem('_pickLocation', this.pickLocations);
                this.setState(RobotState.TASK_SENT);
                this.isPickTaskSent = true;
                this.isDropTaskSent = false;
            }
            else {
                this.setState(RobotState.IDLE);
                this.setType('IDLE')
                this.isPickTaskSent = false;
                this.isDropTaskSent = false;
            }
        }
    }

    private setType(taskType: 'IDLE' | 'PICK' | 'DROP') {
        this.ss.setItem('_type', taskType);
        this.type = taskType
    }

    /**
     * Used to mark the task as complete or skip task
     */
    async skipPickLocation() {
        this.pickLocations = this.ss.getItem('_pickLocation')
        this.print.log('Skip Location Triggered')
        this.setState(RobotState.MOVE_NEXT_PICK);
        console.log('Current Robot State =>',this.stateOfRobot[this.currentState])
    }

    // Helper
    isTaskPresent() {
        this.createdTaskList = this.fetchTaskListFromSS();
        const list = this.getAllTheLocationsFromRawData(this.createdTaskList);
        return list.length === 0
    }

    /**
     * Used to generate the scattered pickLocations into a single list
     * @returns number[]
     */
    private generatePickLocations():number[] {
        let nodes:any = this.configuration?.nodes;
        let pickTaskList = [...(nodes?.pickNode ?? []), nodes?.homeNode];
        return pickTaskList
    }

    // ===================================================================================================
    // Location Acknowledgement timer - Drop Location and Pick Location
    // ===================================================================================================

    timer:number = 0

    dropLocationAck:Ack = {
        skip: false,
        given: false,
        timerRef: null
    }

    pickLocationAck:Ack = {
        skip: false,
        given: false,
        timerRef: null
    }

    isTaskSkipped:boolean = false;

    startAcknowledgementTimer() {
        clearInterval(this.dropLocationAck['timerRef']);
        clearInterval(this.pickLocationAck['timerRef']);

        this.timer = this.configuration.waitingTime;
        this.dropLocationAck['skip'] = false;
        this.pickLocationAck['skip'] = false;

        const ackTimer = (callback:any) => {
            return setInterval(()=>{
                if(this.timer <= 0) {
                    callback();
                    this.clearAcknowledgementTimer();
                }
                else {
                    this.timer-=1
                }
            }, 1000)
        }

        setTimeout(()=>{
            if(this.currentState === RobotState.WAITING_DROP_ACK) {
                this.dropLocationAck['timerRef'] = ackTimer(()=> {
                    clearInterval(this.dropLocationAck['timerRef']);
                    this.dropLocationAck['skip'] = false;
                    this.dropLocationAck['given'] = false;
                    this.ss.setItem('_dropAck', this.dropLocationAck['given']);
                    this.skipTask();
                });
            }
            else if(this.currentState === RobotState.WAITING_PICK_ACK) {
                this.pickLocationAck['timerRef'] = ackTimer(()=> {
                    clearInterval(this.pickLocationAck['timerRef']);
                    this.pickLocationAck['skip'] = false;
                    this.pickLocationAck['given'] = false;
                    this.ss.setItem('_pickAck', this.pickLocationAck['given']);
                    this.skipPickLocation();
                });
            }
            else {
                this.print.log('Some other value is being passed at the time of Waiting ACK');
            }
        },500)
    }

    clearAcknowledgementTimer() {
        if(this.currentState === RobotState.WAITING_DROP_ACK) {
            this.dropLocationAck['skip'] = false;
            this.dropLocationAck['given'] = true;
            this.ss.setItem('_dropAck', this.dropLocationAck['given']);
            clearInterval(this.dropLocationAck['timerRef']);
        }
        else if(this.currentState === RobotState.WAITING_PICK_ACK) {
            this.pickLocationAck['skip'] = false;
            this.pickLocationAck['given'] = true;
            this.ss.setItem('_pickAck', this.pickLocationAck['given']);
            clearInterval(this.pickLocationAck['timerRef']);
        }
        else {
            this.print.log('Some other value is being passed at the time of Waiting ACK');
        }
    }

    skipAckowledgement() {
        if(this.currentState === RobotState.WAITING_DROP_ACK && this.type === 'DROP') {
            this.dropLocationAck['skip'] = true;
            clearInterval(this.dropLocationAck['timerRef']);
        }
        else if(this.currentState === RobotState.WAITING_PICK_ACK && this.type === 'PICK') {
            this.pickLocationAck['skip'] = true;
            clearInterval(this.pickLocationAck['timerRef']);
        }
        else {
            this.print.log('Some other value is being passed at the time of Waiting ACK');
        }
    }

    skipTask() {
        if(!this.isTaskSkipped) {
            this.skippedTaskList[this.liveData?.currentNode?.current] = this.createdTaskList[this.liveData?.currentNode?.current]
        }
        this.createdTaskList[this.liveData?.currentNode?.current] = undefined;
        this.ss.setItem('_taskList', this.createdTaskList);
        this.renderRacks();
        this.setState(RobotState.MOVE_NEXT_DROP);
    }

    // ===================================================================================================
    // Localisation node - Localise Robot
    // ===================================================================================================

    /**
     * Used to Initialize the robot, when it is not localized
     */
    localizeRobot() {
        this.isLocaliseDialogOpen = true;
        this.localisationScore = 0;
        this.api.post('navitrol/initialize', {id: this.configuration.nodes.localizeNode}).subscribe({
            next: (response:any) => {
                this.localisationScore = 0;
                this.print.log('Fetched Localisation Score', this.localisationScore);
                this.print.log('Initialize API Response', response);
                this.localisationStatus = this.liveData.localisation.code
                setTimeout(()=> {
                    const incrementer = setInterval(()=>{
                        if(this.localisationScore >= this.liveData.localisation.score) {
                            clearInterval(incrementer);
                            return
                        }
                        this.localisationScore+=1;
                    },50)
                }, 500)
            },
            error: (error:any) => {
                this.print.error('Error happened while fetching data from the localisation', error);
            }
        })
    }

    /**
     * Used to close the Initialize dialog
     */
    closeLocalize() {
        this.isLocaliseDialogOpen = false;
        this.localisationScore = 0;
    }

    // ===================================================================================================
    // CRUD Action
    // 1. Delete entry - deleteAction()
    // 2. Open the requried taks for the racks - sendRackID()
    // ===================================================================================================

    /**
     * Used to delete an task that is assigned to rack
     */
    deleteAction() {
        // Actual format
        // {
        //    <location_number> : <rack_ids>[]
        // }
        this.print.log(this.selectedRack)
        this.createdTaskList[this.selectedRack.dropLocation] = this.createdTaskList[this.selectedRack.dropLocation].filter((rack:number)=> rack !== this.selectedRack.id);

        this.print.log('After Deleted Rack', this.createdTaskList);
        this.ss.setItem('_taskList', this.createdTaskList);
        this.isDeleteAction = false;
        this.selectedRack = {};
        this.renderRacks();
    }

    /**
     * Used to manage the requried action from the UI for rack selection and task creation
     * @param rack : rack from the list of racks
     * @returns
     */
    sendRackID(rack:any) {
        if(rack.isLoaded) {
            this.isDeleteAction = this.type === 'IDLE' || this.type === 'PICK';
            this.isUnloadAction = this.type === 'DROP' && this.liveData?.currentNode?.status === 13 && this.liveData?.currentNode?.current === Number(rack.dropLocation);
            this.selectedRack = rack;
            this.print.log('Rack Selected', rack, this.liveData?.currentNode?.current, rack.dropLocation)
            return;
        }

        this.ss.setItem('_taskList', this.createdTaskList)
        if(this.type === 'PICK' || this.type === 'IDLE') {
            this.router.navigate(['/rack-select'], {
                queryParams: {id: rack.id}
            })
        }
    }

    /**
     * Used to check that the skip pick up button should be visible or not
     * @returns Boolean
     */
    isSkipPickButtonVisible():boolean {
        return this.pickLocations.length !== 0;
        // return this.pickLocationVisitedCount !== this.getPickNodeListLen();
    }

    /**
     * Used to Acknowledge that the charger is disconnected and Acknowledged
     * @returns boolean
     */
    async isChargeCompleteAck() {
        if(await this.isChargerConnected()) {
            this.print.log('Charger is not Disconnected');
            return false
        }
        this.setState(RobotState.CHARGING_COMPLETE_ACK);
        await this.stateMachine(this.liveData);
        return true
    }

    /**
     * Used to get the length of the list
     *
     * If the len is 1, it returns 1 and if the length is not 1, it returns len-1
     * @returns number
     */
    private getPickNodeListLen():number {
        const pickNodes = this.generatePickLocations()
        if(pickNodes.length === 1) {
            return 1
        }
        else {
            return pickNodes.length
        }
    }

    // ===================================================================================================
    // Conditional Based color function
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

    // ===================================================================================================
    // Helper Functions
    // ===================================================================================================

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

    /**
     * Used to check whether the robot reached drop location or not
     * @param data : liveData
     * @returns boolean
     */
    private isReachedDropLocation(data:any): boolean {
        const list = [...this.configuration?.nodes?.pickNode, this.configuration?.nodes?.chargingNode, this.configuration?.nodes?.homeNode]
        return !list.includes(data?.currentNode?.current) && data?.currentNode?.status === 13
    }

    /**
     * Used to check whether the robot reached pick location
     * @param data : liveData
     * @returns boolean
     */
    private isReachedPickLocation(data:any): boolean {
        const nodes = [...this.configuration?.nodes?.pickNode, this.configuration?.nodes?.homeNode]
        return nodes.includes(data?.currentNode?.current) && data.currentNode?.status === 13
    }

    /**
     * Used to check whether the robot reached Charge location
     * @param data : liveData
     * @returns boolean
     */
    private isReachedChargeLocation(data:any): boolean {
        return data?.currentNode?.current === this.configuration?.nodes?.chargingNode && data.currentNode?.status === 13
    }

    /**
     * Used to check whether the robot needs to be charged
     * @param data : liveData
     * @returns boolean
     */
    private isBatteryNeedsCharge(data:any):boolean {
        return data?.battery <= this.configuration?.battery?.min && this.isTaskListEmpty(this.createdTaskList)
    }

    /**
     * Used to unload the item and check whether the all items in that location is unloaded
     * @param locationId : rack ID
     * @returns boolean
     */
    private isAllUnloaded(locationId:number):boolean {
        this.createdTaskList[this.selectedRack.dropLocation] = this.createdTaskList[this.selectedRack.dropLocation].filter((rack:number)=> rack !== this.selectedRack.id);
        this.ss.setItem('_taskList', this.createdTaskList);
        this.renderRacks();
        if(this.createdTaskList[this.selectedRack.dropLocation].length === 0) {
            return true
        }
        return false
    }

    /**
     * Used to check whether the robot is connected to charger and response is given when the robot started charging
     * @returns boolean
     */
    private isChargerConnected():Promise<boolean> {
        return new Promise((resolve, reject)=> {
            this.api.get('navitrol/charging-status', {}).subscribe({
                next: (response:any) => {
                    resolve(response.data === 1 ? true : false);
                },
                error: (error:any) => {
                    this.print.error('Error Happened while fetching locations in ract-select => ',error);
                    resolve(false);
                }
            })
        })
    }

    /**
     * Used to get the task list from the Storage and it is in raw format
     * @returns raw task list
     */
    private fetchTaskListFromSS():any {
        const tasks = this.ss.getItem('_taskList')

        if(tasks === undefined || tasks === null) {
            return {}
        }
        else {
            return tasks
        }
    }

    /**
     * Used to seperate the valid location ID from the taskList
     * @param list : taskList-any
     * @returns number[] - List of tasks from the task list
     */
    private getAllTheLocationsFromRawData(list:any):number[] {
        this.createdTaskList = this.fetchTaskListFromSS();
        const keys = Object.keys(this.createdTaskList);
        let tempTaskList = [];

        for(let key in keys) {
            if(this.createdTaskList[keys[key]].length !== 0) {
                tempTaskList.push(+keys[key]);
            }
        }
        return tempTaskList
    }

    /**
    * Used to check whether the robot is fully charged
    * @param data: liveData
    * @returns boolean
    * @file  Use this in to bring the acknowledgement button in charging screen and press the button to change state to RobotState.CHARGING_COMPLETE_ACK
    */
    isBatteryFullyCharged(data:any): boolean {
        return data?.battery >= this.configuration?.battery?.max
    }

    /**
     * Used to check for skipped task
     *
     * True - it is created and sent to the robot
     *
     * False - If there is no skipped task
     * @returns boolean
     */
    private checkForSkippedTask(): boolean {
        if(this.isTaskListEmpty(this.skippedTaskList)) {
            return false
        }
        else {
            this.createdTaskList = this.skippedTaskList;
            this.skippedTaskList = {};
            this.ss.setItem('_taskList', this.createdTaskList);
            this.taskList = this.getAllTheLocationsFromRawData(this.createdTaskList);
            this.logs.send(250, 'Skipped task assigned', 'All the skipped task is assigned to the tasklist and updated');
            return true
        }
    }

    private setRefencePoint(id?:string | number) {
        if(!id) {
            id = this.configuration?.nodes?.homeNode;
        }

        this.api.post('navitrol/set-pick-location', {id}).subscribe({
            next: (response:any) => {
                this.print.log('Reference point has been set =>', response);
                this.logs.send(200, `Reference point has been initialized in => ${id}`, 'Set Reference Location API Success');
            },
            error: (error:any) => {
                this.print.error('Error happened while sending data to the robot', error);
                this.logs.send(200, `Refernce point not set => ${id}`, 'Pick Location API Failure');
            }
        })
    }

    // ===================================================================================================
    // UI based Helper functions
    // ===================================================================================================
    getCurrentPickTaskLoationsLen() {
        const pickLocations:number[] = this.ss.getItem('_pickLocation') ?? [];
        return pickLocations.length;
    }
}
