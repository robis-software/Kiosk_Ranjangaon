import { Component, OnDestroy, OnInit } from '@angular/core';
import { TitleComponent } from "../../Components/title/title.component";
import { IconsComponent } from "../../Components/icons/icons.component";
import Print from '../../Utils/print';
import { colors } from '../../Utils/colors';
import { ApiService } from '../../Services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionStorageService } from '../../Services/session-storage.service';
import { IllustrationsComponent } from '../../Components/illustrations/illustrations.component'
import { Subscription } from 'rxjs';
import { LoadingUiComponent } from "../../Components/loading-ui/loading-ui.component";
@Component({
  selector: 'ranjangaon-rack-select',
  standalone: true,
  imports: [TitleComponent, IconsComponent, IllustrationsComponent, LoadingUiComponent],
  templateUrl: './rack-select.component.html',
  styleUrl: './rack-select.component.css'
})
export class RackSelectComponent implements OnInit, OnDestroy {
    colors:any;
    print!:Print;
    locations:any[] = []
    rackId:number = 0;

    private locationDetailsSubscription!:Subscription;

    configuration:any;

    taskList:any = {};

    noDataIllustration:boolean = false;
    isLoading:boolean = true;

    constructor(private readonly api:ApiService, private readonly activeRoute:ActivatedRoute, private readonly router:Router, private readonly ss:SessionStorageService) {
        this.colors = colors;
        this.print = new Print();
        this.configuration = this.ss.getItem('_config')
    }

    ngOnInit(): void {
        this.activeRoute.queryParamMap.subscribe((param:any) => {
            this.rackId = param.get('id');
            this.fetchLocations();
            // this.locations = [1,2,3,4,5,6];
            this.taskList = this.ss.getItem('_taskList');
        })
    }

    private fetchLocations() {
        const locationToBeIgnored = this.ignoreLocations();
        this.isLoading = true;
        this.locationDetailsSubscription = this.api.get('navitrol/location-list', {}).subscribe({
            next: (response:any) => {
                this.print.log(response);
                this.locations = response.data.filter((data:any) => !locationToBeIgnored.includes(data)).sort();
                this.setPickPoint();
                this.noDataIllustration = false;
                this.isLoading = false;
            },
            error: (error:any) => {
                this.print.error('Error Happened while fetching locations in ract-select => ',error);
                this.noDataIllustration = true;
                this.isLoading = false;
            }
        })
    }

    private ignoreLocations():number[] {
        const ignoredLocations = [];
        const lenOfPickNodeList = this.configuration?.nodes?.pickNode.length;

        // Pick Nodes added to the ignorance list
        for(let i=0; i<lenOfPickNodeList; i++) {
            ignoredLocations.push(this.configuration?.nodes?.pickNode[i])
        }

        // Add charging node to the ignorance list
        ignoredLocations.push(this.configuration?.nodes?.chargingNode);
        ignoredLocations.push(this.configuration?.nodes?.homeNode);

        return ignoredLocations;

    }

    private setPickPoint() {
        this.api.post('navitrol/set-pick-location', {id: this.configuration?.nodes?.homeNode}).subscribe({
            next: (response:any) => {
                this.print.log('Pick Location Set to the robot!!', response);
            },
            error: (error:any) => {
                this.print.error('Error happened while sending data to the robot', error);
            }
        })
    }

    addTask(id:number) {
        // Step 1: Check whether there is Location entered
        if(this.taskList[+id] === null || this.taskList[+id]?.length === 0 || this.taskList[+id] === undefined) {
            const racks = [];
            racks.push(+this.rackId);
            this.taskList[+id] = racks
        }
        else {
            this.taskList[+id].push(+this.rackId);
        }


        this.print.log({locations: Object.keys(this.taskList), racks: Object.values(this.taskList)});
        this.addTaskToUnOrderedList(+id);
        this.ss.setItem('_taskList', this.taskList);
        this.goHome();
    }

    private addTaskToUnOrderedList(id:number) {
        const unOrderedList:number[] = this.ss.getItem('_unOrderedList') ?? [];
        if(!unOrderedList.includes(id)) {
            unOrderedList.push(+id)
            this.ss.setItem('_unOrderedList', unOrderedList);
        }
    }

    goHome() {
        this.print.log('Go Home Triggered')
        this.router.navigate(['/']);
    }

    ngOnDestroy(): void {
        this.locationDetailsSubscription.unsubscribe()
    }
}
