import { AfterViewInit, Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import Print from '../../Utils/print';
import { SessionStorageService } from '../../Services/session-storage.service';
import { ApiService } from '../../Services/api.service';
import { colors } from '../../Utils/colors';
import { CommonModule } from '@angular/common';
import { IconsComponent } from "../../Components/icons/icons.component";
import { CircularIndicatorComponent } from "../../Components/circular-indicator/circular-indicator.component";
import { LiveStatusService } from '../../Services/live-status.service';
import { RackSelectComponent } from "../rack-select/rack-select.component";
import { Router } from '@angular/router';
import { TitleComponent } from "../../Components/title/title.component";
import { PopupComponent } from "../../Components/popup/popup.component";
import { SseService } from '../../Services/sse.service';

@Component({
  selector: 'ranjangaon-dashboard',
  standalone: true,
  imports: [CommonModule, IconsComponent, CircularIndicatorComponent, RackSelectComponent, TitleComponent, PopupComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})

export class DashboardComponent implements OnInit, AfterViewInit {
    @ViewChild('rackContainer')rackContainer!:ElementRef<HTMLDivElement>
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

    openForRack:number = 0;

    enableStartButton:boolean = false;

    // Delete Action
    isDeleteAction:boolean = false;
    deleteActionRackID:number | null = 0;

    // Localisation
    isLocalize:boolean = false;
    localisationScoreAtMannual:number = 0;

    // Localisation - from live data
    isLocalisationError:boolean = true;

    // Acknowledgement
    isAcknowledgement:boolean = false;


    constructor(private readonly ss:SessionStorageService, private readonly api:ApiService, private readonly router:Router, private readonly liveStream:SseService) {}

    ngOnInit(): void {
        this.colors = colors;
        this.print = new Print();
        this.monitorStatus();
        this.configuration = this.ss.getItem('_config');
        this.ss.removeItem("_authenication")

        const tasks = this.ss.getItem('_taskList')

        if(tasks === undefined || tasks === null) {
            this.taskList = {}
        }
        else {
            this.taskList = tasks
        }

        this.generateRacks(this.configuration.racks.rows * this.configuration.racks.columns);
        this.enableStartButton = false;

        this.racksArray.forEach((rack:any)=> {
            if(this.taskList[rack.id]) {
                rack.isLoaded = this.taskList[rack.id].dropLocation !== undefined || this.taskList[rack.id].dropLocation !== null;
                rack.dropLocation = this.taskList[rack.id].dropLocation;
                this.enableStartButton = true
            }
        });

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
        for(let i=0; i< size; i++) {
            const rack = {
                isLoaded: false,
                dropLocation: '',
                id: this.racksArray.length + 1,
            }
            this.racksArray.push(rack)
        }
    }

    sendRackID(id:any, isOpenRack:boolean) {
        if(isOpenRack) {
            this.print.log('This rack has been filed already!!');
            this.isDeleteAction = true;
            this.deleteActionRackID = id;
            return;
        }
        this.openForRack = id;
        this.ss.setItem('_taskList', this.taskList)
        this.router.navigate(['/rack-select'], {
            queryParams: {id}
        })
    }

    private monitorStatus() {
        this.liveStream.serverEvent$.subscribe((data:any) => {
            this.liveData = data;
            // this.print.log('Response from Dashboard => ', this.liveData);
        })
    }

    deleteAction() {
        this.taskList[this.deleteActionRackID as number] = null;
        this.racksArray.forEach((rack:any) => {
            if(rack.id === this.deleteActionRackID) {
                rack.isLoaded = false;
                rack.dropLocation = '';
            }
        })

        this.print.log('Updated racksArray', this.racksArray)
        this.print.log('Updated TaskList', this.taskList)

        this.ss.setItem('_taskList', this.taskList);
        this.isDeleteAction = false;
        this.deleteActionRackID = null;
        this.checkForTaskAvailable(this.taskList);
    }

    localizeRobot() {
        this.isLocalize = true;
        this.localisationScoreAtMannual = 0;
        this.api.get('test/localize', {}).subscribe({
            next: (response:any) => {
                this.localisationScoreAtMannual = 0;
                this.print.log('Fetched Localisation Score', this.localisationScoreAtMannual);

                setTimeout(()=> {
                    const incrementer = setInterval(()=>{
                        if(this.localisationScoreAtMannual >= response.data) {
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
    }

    // ===================================================================================================
    // Helper Function
    // ===================================================================================================
    batteryIndicatorColor(value:number) {
        if(value >= 31) return colors.status.green;
        else if(value >=16) return colors.status.yellow;
        else return colors.status.red;
    }

    // Used to check the task list is empty
    private checkForTaskAvailable(list:any) {
        const listValues = Object.values(list);
        const lenOfList = listValues.length;

        // Flag
        let flag = 0

        listValues.forEach((listData:any)=> {
            if(listData === null || listData === undefined || listData === '') {
                flag+=1;
                if(flag === lenOfList) {
                    this.enableStartButton = false;
                }
            }
        })

        flag = 0;
    }
}
