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

// FIX: Removed unused TASK_CREATED state
enum RobotState {
    IDLE,
    TASK_READY,
    TASK_SENT,
    MOVE_NEXT_DROP,
    MOVE_NEXT_PICK,
    ARRIVED_PICK,
    ARRIVED_DROP,
    ARRIVED_CHARGE,
    WAITING_DROP_ACK,
    WAITING_PICK_ACK,
    DROP_ACK,
    PICK_ACK,
    CHARGING_REQUESTED,
    CHARGER_CONNECTED,
    CHARGING,
    CHARGING_COMPLETE_ACK
}

interface Ack {
    timerRef: any,
    given: boolean,
    skip: boolean
}

// @Component({
// //   selector: 'ranjangaon-dashboard',
// // standalone: true,
//   imports: [CommonModule, IconsComponent, CircularIndicatorComponent, PopupComponent],
//   templateUrl: './dashboard.component.html',
//   styleUrl: './dashboard.component.css'
// })

export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('rackContainer') rackContainer!: ElementRef<HTMLDivElement>;
    private subscription!: Subscription;

    // Actions
    private readonly pickAPI!: TasksCore;
    private readonly chargeAPI!: TasksCore;
    private readonly taskAPI!: TasksCore;

    // General Parameters
    colors: any;
    print!: Print;
    configuration: any;

    // Live parameters
    liveData: any;

    // Racks
    racksArray: any[] = [];
    selectedRack: any;

    // Task list Parameters
    // createdTaskList => raw map from session storage: { locationId: [rackId, rackId] }
    // taskList        => flat array of location IDs extracted for sending to robot: [3, 5, 7]
    createdTaskList: Record<string, number[]> = {};
    skippedTaskList: Record<string, number[]> = {};
    taskList: number[] = [];
    isTaskListSent: boolean = false;

    // Robot State
    currentState: RobotState = RobotState.IDLE;

    // Dialog Parameters
    isDeleteAction: boolean = false;
    isUnloadAction: boolean = false;

    // Home Location parameters
    isHomeReached: boolean = false;

    // Charging Location Parameters
    charging: Record<string, any> = {
        reached: false,
        taskSent: false,
        batteryMonitor: null,
        disconnectedAckGiven: false,
        powerConnected: false
    }

    // FIX: Guard to prevent concurrent stateMission calls from SSE stream
    private isProcessing: boolean = false;

    constructor(
        private readonly ss: SessionStorageService,
        private readonly api: ApiService,
        private readonly router: Router,
        private readonly liveStream: SseService,
        private readonly cdf: ChangeDetectorRef,
        private readonly logs: LogsService
    ) {
        this.chargeAPI = new TasksCore(this.api, this.logs, 'charge');
        this.pickAPI = new TasksCore(this.api, this.logs, 'pick');
        this.taskAPI = new TasksCore(this.api, this.logs, 'task');
    }

    ngOnInit(): void {
        this.colors = colors;
        this.print = new Print();
        this.configuration = this.ss.getItem('_config');
        this.monitorStatus();
        this.ss.removeItem("_authenication");
        this.createdTaskList = this.fetchTaskListFromSS();
        this.renderRacks();
    }

    ngAfterViewInit(): void {
        this.print.log('Configuration from dashboard!! \n', this.configuration);
        if (this.rackContainer) {
            const rackContRef = this.rackContainer.nativeElement;
            rackContRef.style.gridTemplateRows = `repeat(${this.configuration.racks.rows}, 1fr)`;
            rackContRef.style.gridTemplateColumns = `repeat(${this.configuration.racks.columns}, 1fr)`;
        }
    }

    // ===================================================================================================
    // SSE Monitor
    // ===================================================================================================

    private monitorStatus(): void {
        this.subscription = this.liveStream.getStream().subscribe({
            next: (data: any) => {
                this.liveData = data;
                this.stateMission(data);
                this.cdf.detectChanges();
            },
            error: (error: any) => {
                this.print.error('SSE stream error =>', error);
            }
        });
    }

    // ===================================================================================================
    // Rack Rendering
    // ===================================================================================================

    generateRacks(size: number) {
        this.racksArray = [];
        for (let i = 0; i < size; i++) {
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
        this.print.log('Tasks Lists =>', this.createdTaskList);
        const taskLocations: any = Object.keys(this.createdTaskList);
        const taskRacks: any = Object.values(this.createdTaskList);
        this.generateRacks(this.configuration.racks.rows * this.configuration.racks.columns);
        taskLocations.forEach((location: number, index: number) => {
            taskRacks[index].forEach((racks: number) => {
                const currentRack = this.racksArray[racks - 1];
                currentRack.isLoaded = true;
                currentRack.dropLocation = location;
                this.racksArray[racks - 1] = currentRack;
            })
        })
        this.cdf.detectChanges();
        this.print.log('Updated Racks', this.racksArray);
    }

    private fetchTaskListFromSS(): Record<string, number[]> {
        const tasks = this.ss.getItem('_taskList');
        if (tasks === undefined || tasks === null) {
            return {};
        }
        return tasks;
    }

    sendRackID(rack: any) {
        if (rack.isLoaded) {
            this.isDeleteAction = !this.isTaskListSent;
            this.isUnloadAction = this.isTaskListSent && this.liveData?.currentNode?.status === 13 && this.liveData?.currentNode?.current === +rack.dropLocation;
            this.selectedRack = rack;
            this.print.log('Rack Selected', rack, this.liveData?.currentNode?.current, rack.dropLocation);
            return;
        }
        this.ss.setItem('_taskList', this.createdTaskList);
        if (!this.isTaskListSent) {
            this.router.navigate(['/rack-select'], {
                queryParams: { id: rack.id }
            });
        }
    }

    // ===================================================================================================
    // UI Actions — called from template buttons
    // ===================================================================================================

    /**
     * Called when the user clicks "Start" button.
     * Prepares the task list and sends robot to TASK_READY.
     */
    sendTaskToTheRobot() {
        this.createdTaskList = this.ss.getItem('_taskList');
        this.taskList = this.getAllTheLocationsFromRawData(this.createdTaskList);
        if (this.taskList.length !== 0) {
            this.setState(RobotState.TASK_READY);
            this.stateMission(this.liveData);
        }
    }

    /**
     * Called from UI button at pickNode[0] (IDLE state).
     * Sends robot to pickNode[1] to begin the pick route.
     */
    startPickRoute() {
        if (this.currentState !== RobotState.IDLE) return;
        this.currentPickLocationIndex = 1;
        this.setState(RobotState.MOVE_NEXT_PICK);
        this.stateMission(this.liveData);
    }

    /**
     * Called from UI "Move to Next Location" button at pickNode[1..n].
     * Robot is waiting at a pick location and user confirms to move next.
     */
    moveToNextPickLocation() {
        if (this.currentState !== RobotState.WAITING_PICK_ACK) return;
        this.clearAcknowledgementTimer();
        this.currentPickLocationIndex++;
        this.setState(RobotState.MOVE_NEXT_PICK);
        this.stateMission(this.liveData);
    }

    /**
     * Called from UI "ACK" button when robot arrives at drop location.
     */
    giveDropAcknowledgement() {
        if (this.currentState !== RobotState.WAITING_DROP_ACK) return;
        this.clearAcknowledgementTimer();
        this.setState(RobotState.DROP_ACK);
        this.stateMission(this.liveData);
    }

    /**
     * Called from UI "Charging Complete" popup ACK button.
     * User confirms charger is disconnected after full charge.
     */
    giveChargingCompleteAck() {
        if (this.currentState !== RobotState.CHARGING) return;
        this.charging['disconnectedAckGiven'] = true;
        this.setState(RobotState.CHARGING_COMPLETE_ACK);
        this.stateMission(this.liveData);
    }

    private getAllTheLocationsFromRawData(list: Record<string, number[]>): number[] {
        const keys = Object.keys(list);
        let tempTaskList: number[] = [];
        for (let key of keys) {
            if (list[key].length !== 0) {
                tempTaskList.push(+key);
            }
        }
        return tempTaskList;
    }

    // ===================================================================================================
    // Location Acknowledgement timer - Drop Location and Pick Location
    // ===================================================================================================

    timer: number = 0;

    dropLocationAck: Ack = {
        skip: false,
        given: false,
        timerRef: null
    }

    pickLocationAck: Ack = {
        skip: false,
        given: false,
        timerRef: null
    }

    isTaskSkipped: boolean = false;
    currentPickLocationIndex: number = 0;

    startAcknowledgementTimer() {
        this.timer = this.configuration.waitingTime;

        const ackTimer = (callback: any) => {
            return setInterval(() => {
                if (this.timer <= 0) {
                    callback();
                    this.clearAcknowledgementTimer();
                } else {
                    this.timer -= 1;
                }
            }, 1000);
        }

        setTimeout(() => {
            if (this.currentState === RobotState.WAITING_DROP_ACK) {
                this.dropLocationAck['skip'] = false;
                this.dropLocationAck['timerRef'] = ackTimer(() => {
                    clearInterval(this.dropLocationAck['timerRef']);
                    this.dropLocationAck['skip'] = false;
                    this.skipTask();
                });
            }
            else if (this.currentState === RobotState.WAITING_PICK_ACK) {
                this.pickLocationAck['skip'] = false;
                this.pickLocationAck['timerRef'] = ackTimer(() => {
                    clearInterval(this.pickLocationAck['timerRef']);
                    this.pickLocationAck['skip'] = false;
                    this.skipPickLocation();
                });
            }
            else {
                this.print.log('Some other value is being passed at the time of Waiting ACK');
            }
        }, 500);
    }

    clearAcknowledgementTimer() {
        if (this.currentState === RobotState.WAITING_DROP_ACK) {
            this.dropLocationAck['skip'] = false;
            this.dropLocationAck['given'] = true;
            clearInterval(this.dropLocationAck['timerRef']);
        }
        else if (this.currentState === RobotState.WAITING_PICK_ACK) {
            this.pickLocationAck['skip'] = false;
            this.pickLocationAck['given'] = true;
            clearInterval(this.pickLocationAck['timerRef']);
        }
        else {
            this.print.log('Some other value is being passed at the time of Waiting ACK');
        }
    }

    // FIX: Renamed from skipAckowledgement (typo) but kept the logic
    skipAcknowledgement() {
        if (this.currentState === RobotState.WAITING_DROP_ACK) {
            this.dropLocationAck['skip'] = true;
            clearInterval(this.dropLocationAck['timerRef']);
            this.skipTask();
        }
        else if (this.currentState === RobotState.WAITING_PICK_ACK) {
            this.pickLocationAck['skip'] = true;
            clearInterval(this.pickLocationAck['timerRef']);
            this.skipPickLocation();
        }
        else {
            this.print.log('Some other value is being passed at the time of Waiting ACK');
        }
    }

    skipTask() {
        if (!this.isTaskSkipped) {
            this.skippedTaskList[this.liveData?.currentNode?.current] = this.createdTaskList[this.liveData?.currentNode?.current];
        }
        this.createdTaskList[this.liveData?.currentNode?.current] = [];
        // FIX: Save createdTaskList (rack map) not taskList (flat array)
        this.ss.setItem('_taskList', this.createdTaskList);
        this.renderRacks();
        this.setState(RobotState.MOVE_NEXT_DROP);
        this.stateMission(this.liveData);
    }

    async skipPickLocation() {
        // FIX: Compare index to last index, not to a node ID value
        if (this.currentPickLocationIndex === this.configuration?.nodes?.pickNode.length - 1) {
            if (await this.taskAPI.createTask(this.taskList)) {
                this.setState(RobotState.TASK_SENT);
            }
            else {
                this.setState(RobotState.WAITING_PICK_ACK);
            }
            return;
        }
        this.currentPickLocationIndex++;
        this.setState(RobotState.MOVE_NEXT_PICK);
        this.stateMission(this.liveData);
    }

    // ===================================================================================================
    // Helper Functions
    // ===================================================================================================

    private isTaskListEmpty(list: Record<string, number[]>): boolean {
        const racks = Object.values(list);
        let flag = 0;
        racks.forEach((rack: any) => {
            if (rack !== undefined && rack.length !== 0) {
                flag += 1;
            }
        });
        return flag === 0;
    }

    private isReachedDropLocation(data: any): boolean {
        const excludedNodes = [
            ...this.configuration?.nodes?.pickNode,
            this.configuration?.nodes?.chargingNode
        ];
        return !excludedNodes.includes(data?.currentNode?.current) && data?.currentNode?.status === 13;
    }

    private isReachedPickLocation(data: any): boolean {
        // FIX: pickNode is an array — check if current node is any pick node
        return this.configuration?.nodes?.pickNode.includes(data?.currentNode?.current) && data?.currentNode?.status === 13;
    }

    private isReachedChargeLocation(data: any): boolean {
        return data?.currentNode?.current === this.configuration?.nodes?.chargingNode
            && data?.currentNode?.status === 13;
    }

    private isBatteryNeedsCharge(data: any): boolean {
        return data?.battery <= this.configuration?.battery?.min && this.isTaskListEmpty(this.createdTaskList);
    }

    isBatteryFullyCharged(data: any): boolean {
        return data?.battery >= this.configuration?.battery?.max;
    }

    private isAllUnloaded(): boolean {
        this.createdTaskList[this.selectedRack.dropLocation] = this.createdTaskList[this.selectedRack.dropLocation].filter(
            (rack: number) => rack !== this.selectedRack.id
        );
        this.ss.setItem('_taskList', this.createdTaskList);
        if (this.createdTaskList[this.selectedRack.dropLocation].length === 0) {
            this.renderRacks();
            return true;
        }
        return false;
    }

    private isChargerConnected(): Promise<boolean> {
        return new Promise((resolve) => {
            this.api.get('navitrol/charging-status', {}).subscribe({
                next: (response: any) => {
                    resolve(response.data === 1);
                },
                error: (error: any) => {
                    this.print.error('Error while fetching charging status =>', error);
                    resolve(false);
                }
            });
        });
    }

    private isAtHomePickLocation(data: any): boolean {
        return data?.currentNode?.current === this.configuration?.nodes?.pickNode[0]
            && data?.currentNode?.status === 13;
    }

    // ===================================================================================================
    // Angular Events
    // ===================================================================================================

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
        // FIX: Clear all timers on destroy to prevent memory leaks
        clearInterval(this.dropLocationAck.timerRef);
        clearInterval(this.pickLocationAck.timerRef);
        clearInterval(this.charging['batteryMonitor']);
    }

    // ===================================================================================================
    // State Machine
    // ===================================================================================================

    private setState(newState: RobotState) {
        this.print.log(`Transition happened from ${RobotState[this.currentState]} => ${RobotState[newState]}`);
        this.currentState = newState;
    }

    private async stateMission(data: any) {
        // FIX: Guard against concurrent SSE calls corrupting state
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const nodes = this.configuration?.nodes;

            switch (this.currentState) {

                // -----------------------------------------------------------------
                // IDLE: Robot is at pickNode[0], waiting for user to start pick route
                // OR returning here after charging
                // -----------------------------------------------------------------
                case RobotState.IDLE:
                    // After charging: battery full + user gave charging complete ack
                    if (this.isBatteryFullyCharged(data) && this.charging['disconnectedAckGiven']) {
                        this.charging['disconnectedAckGiven'] = false; // reset for next charge cycle
                        this.setState(
                            await this.pickAPI.createTask([nodes?.pickNode[0]])
                                ? RobotState.TASK_SENT
                                : RobotState.IDLE
                        );
                        break;
                    }
                    // Battery low and no tasks pending → go charge
                    if (this.isBatteryNeedsCharge(data)) {
                        this.setState(RobotState.CHARGING_REQUESTED);
                        break;
                    }
                    // Otherwise stay IDLE — user will press "Start Pick Route" button
                    break;

                // -----------------------------------------------------------------
                // TASK_READY: User pressed Start, send full drop task list to robot
                // -----------------------------------------------------------------
                case RobotState.TASK_READY:
                    if (await this.taskAPI.createTask(this.taskList)) {
                        this.isTaskListSent = true;
                        this.setState(RobotState.TASK_SENT);
                        break;
                    }
                    this.print.log('Task list not sent to robot!!');
                    this.setState(RobotState.IDLE);
                    break;

                // -----------------------------------------------------------------
                // CHARGING_REQUESTED: Send robot to charging station
                // -----------------------------------------------------------------
                case RobotState.CHARGING_REQUESTED:
                    if (await this.chargeAPI.createTask([nodes?.chargingNode])) {
                        this.setState(RobotState.TASK_SENT);
                    } else {
                        this.setState(RobotState.IDLE);
                    }
                    break;

                // -----------------------------------------------------------------
                // TASK_SENT: Robot is moving — watch where it arrives
                // -----------------------------------------------------------------
                case RobotState.TASK_SENT:
                    if (this.isReachedChargeLocation(data)) {
                        // FIX: Set charging.reached = true when charge location reached
                        this.charging['reached'] = true;
                        this.setState(RobotState.ARRIVED_CHARGE);
                    }
                    else if (this.isReachedPickLocation(data)) {
                        // FIX: Set charging.reached = false for any non-charge arrival
                        this.charging['reached'] = false;
                        this.setState(RobotState.ARRIVED_PICK);
                    }
                    else if (this.isReachedDropLocation(data)) {
                        this.charging['reached'] = false;
                        this.setState(RobotState.ARRIVED_DROP);
                    }
                    break;

                // -----------------------------------------------------------------
                // ARRIVED_PICK:
                //   - pickNode[0] → completeTask → IDLE (wait for user to start route)
                //   - pickNode[1..n] → completeTask → PICK_ACK → WAITING_PICK_ACK
                // -----------------------------------------------------------------
                case RobotState.ARRIVED_PICK:
                    if (this.isAtHomePickLocation(data)) {
                        // Home pick location — no ACK, just go IDLE and wait
                        await this.pickAPI.completeTask(nodes?.pickNode[0]);
                        this.currentPickLocationIndex = 0;
                        this.setState(RobotState.IDLE);
                    } else {
                        const reachedPickLocation = nodes?.pickNode.includes(data?.currentNode?.current)
                            ? data?.currentNode?.current
                            : -1;
                        if (await this.pickAPI.completeTask(reachedPickLocation)) {
                            this.setState(RobotState.PICK_ACK);
                        } else {
                            this.setState(RobotState.TASK_SENT);
                        }
                    }
                    break;

                // -----------------------------------------------------------------
                // PICK_ACK: completeTask succeeded at a non-home pick location
                // Start timer — user must ACK or skip
                // -----------------------------------------------------------------
                case RobotState.PICK_ACK:
                    this.setState(RobotState.WAITING_PICK_ACK);
                    this.startAcknowledgementTimer();
                    break;

                // -----------------------------------------------------------------
                // WAITING_PICK_ACK: Robot is waiting at pick location
                // Transitions happen via:
                //   - moveToNextPickLocation() button → clears timer, increments index
                //   - skipAcknowledgement() button   → skips, increments index
                //   - timer runs out                 → skipPickLocation()
                // Nothing to do here in stateMission
                // -----------------------------------------------------------------
                case RobotState.WAITING_PICK_ACK:
                    break;

                // -----------------------------------------------------------------
                // MOVE_NEXT_PICK: Send robot to next pick location
                // If it was the last pick location, send the full drop task list
                // -----------------------------------------------------------------
                case RobotState.MOVE_NEXT_PICK:
                    if (this.currentPickLocationIndex > nodes?.pickNode.length - 1) {
                        // All pick locations visited — start drop phase
                        if (await this.taskAPI.createTask(this.taskList)) {
                            this.isTaskListSent = true;
                            this.setState(RobotState.TASK_SENT);
                        }
                    } else {
                        if (await this.pickAPI.createTask([nodes?.pickNode[this.currentPickLocationIndex]])) {
                            this.setState(RobotState.TASK_SENT);
                        }
                    }
                    break;

                // -----------------------------------------------------------------
                // ARRIVED_DROP: Robot reached a drop location
                // Start ACK timer — user must unload and ACK
                // -----------------------------------------------------------------
                case RobotState.ARRIVED_DROP:
                    this.dropLocationAck['given'] = false;
                    this.setState(RobotState.WAITING_DROP_ACK);
                    this.startAcknowledgementTimer();
                    break;

                // -----------------------------------------------------------------
                // WAITING_DROP_ACK: Robot waiting at drop location
                // Transitions happen via:
                //   - giveDropAcknowledgement() button → clears timer → DROP_ACK
                //   - skipAcknowledgement() button     → skipTask()
                //   - timer runs out                   → skipTask()
                // Nothing to do here in stateMission
                // -----------------------------------------------------------------
                case RobotState.WAITING_DROP_ACK:
                    break;

                // -----------------------------------------------------------------
                // DROP_ACK: User pressed ACK at drop location
                // Check if all racks at this location are unloaded
                // -----------------------------------------------------------------
                case RobotState.DROP_ACK:
                    // FIX: was `this,this.isUnloadAction = false` (typo)
                    this.isUnloadAction = false;
                    if (this.isAllUnloaded()) {
                        this.setState(RobotState.MOVE_NEXT_DROP);
                        await this.stateMission(data); // immediately proceed
                    }
                    break;

                // -----------------------------------------------------------------
                // MOVE_NEXT_DROP: Complete this drop task and move to next
                // If all drops done, send robot back to pickNode[0]
                // -----------------------------------------------------------------
                case RobotState.MOVE_NEXT_DROP:
                    if (this.isTaskListEmpty(this.createdTaskList)) {
                        // All drops done — return robot to home pick location
                        await this.pickAPI.createTask([nodes?.pickNode[0]]);
                        this.isTaskListSent = false;
                        this.setState(RobotState.TASK_SENT);
                    }
                    // FIX: was two separate `if` blocks causing fall-through
                    else if (await this.taskAPI.completeTask(data?.currentNode?.current)) {
                        this.setState(RobotState.TASK_SENT);
                    }
                    break;

                // -----------------------------------------------------------------
                // ARRIVED_CHARGE: Robot reached charging station
                // -----------------------------------------------------------------
                case RobotState.ARRIVED_CHARGE:
                    if (await this.chargeAPI.completeTask(this.configuration?.nodes?.chargingNode)) {
                        this.setState(RobotState.CHARGER_CONNECTED);
                    }
                    break;

                // -----------------------------------------------------------------
                // CHARGER_CONNECTED: Poll until physical charger is connected
                // -----------------------------------------------------------------
                case RobotState.CHARGER_CONNECTED:
                    if (await this.isChargerConnected()) {
                        this.charging['powerConnected'] = true;
                        this.setState(RobotState.CHARGING);
                    }
                    break;

                // -----------------------------------------------------------------
                // CHARGING: Robot is charging
                // isBatteryFullyCharged() is checked in the template to show the popup
                // User presses ACK in popup → giveChargingCompleteAck() is called
                // -----------------------------------------------------------------
                case RobotState.CHARGING:
                    // Nothing to do here — UI popup drives the next transition
                    // via giveChargingCompleteAck()
                    break;

                // -----------------------------------------------------------------
                // CHARGING_COMPLETE_ACK: Charger disconnected, send robot back to pick
                // -----------------------------------------------------------------
                case RobotState.CHARGING_COMPLETE_ACK:
                    if (await this.pickAPI.createTask([nodes?.pickNode[0]])) {
                        this.setState(RobotState.TASK_SENT);
                    }
                    break;
            }
        } finally {
            this.isProcessing = false;
        }
    }
}
