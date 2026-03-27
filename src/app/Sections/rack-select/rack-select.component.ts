import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TitleComponent } from "../../Components/title/title.component";
import { IconsComponent } from "../../Components/icons/icons.component";
import Print from '../../Utils/print';
import { colors } from '../../Utils/colors';
import { ApiService } from '../../Services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionStorageService } from '../../Services/session-storage.service';

@Component({
  selector: 'ranjangaon-rack-select',
  standalone: true,
  imports: [TitleComponent, IconsComponent],
  templateUrl: './rack-select.component.html',
  styleUrl: './rack-select.component.css'
})
export class RackSelectComponent implements OnInit {
    colors:any;
    print!:Print;
    locations:any[] = []
    rackId:number = 0;

    configuration:any;

    taskList:any = {};

    constructor(private readonly api:ApiService, private readonly activeRoute:ActivatedRoute, private readonly router:Router, private readonly ss:SessionStorageService) {
        this.colors = colors;
        this.print = new Print();
        this.configuration = this.ss.getItem('_config')
    }

    ngOnInit(): void {
        this.activeRoute.queryParamMap.subscribe((param:any) => {
            this.rackId = param.get('id');
            this.fetchLocations();
        })
    }

    private fetchLocations() {
        this.taskList = this.ss.getItem('_taskList');
        const locationToBeIgnored = Object.values(this.configuration.nodes);
        this.api.get('navitrol/location-list', {}).subscribe({
            next: (response:any) => {
                this.print.log(response);
                this.locations = response.data.filter((data:any) => !locationToBeIgnored.includes(data)).sort();
            },
            error: (error:any) => {
                this.print.error('Error Happened while fetching locations in ract-select => ',error)
            }
        })
    }

    addTask(id:number) {

        // Step 1: Check whether there is Location entered
        if(this.taskList[id] === null || this.taskList[id]?.length === 0 || this.taskList[id] === undefined) {
            const racks = [];
            racks.push(+this.rackId);
            this.taskList[+id] = racks
        }
        else {
            this.taskList[+id].push(+this.rackId);
        }

        this.print.log({locations: Object.keys(this.taskList), racks: Object.values(this.taskList)});

        this.ss.setItem('_taskList', this.taskList);
        this.goHome();
    }

    goHome() {
        this.print.log('Go Home Triggered')
        this.router.navigate(['/']);
    }
}
