import { Component, OnInit } from '@angular/core';
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

    taskList:any = {};

    configuration:any;

    constructor(private readonly api:ApiService, private readonly activeRoute:ActivatedRoute, private readonly router:Router, private readonly ss:SessionStorageService) {
        this.colors = colors;
        this.print = new Print();
        this.configuration = this.ss.getItem('_config');
    }

    ngOnInit(): void {
        this.activeRoute.queryParamMap.subscribe((param:any) => {
            this.rackId = param.get('id');
            this.fetchLocations();
        })
    }

    private fetchLocations() {
        this.taskList = this.ss.getItem('_taskList');
        this.api.get('navitrol/location-list', {}).subscribe({
            next: (response:any) => {
                this.print.log('Location-list response => ',response);
                const notUnloadLocation = Object.values(this.configuration.nodes);
                this.print.log({response, notUnloadLocation})
                this.locations = response.data.filter((data:any) => !notUnloadLocation.includes(data));
            },
            error: (error:any) => {
                this.print.error('Error Happened while fetching locations in ract-select => ',error)
            }
        })
    }

    addTask(id:number) {
        const task = {
            id: this.rackId, // id(key) refers Rack ID
            dropLocation: id
        }

        this.taskList[this.rackId] = task;
        this.ss.setItem('_taskList', this.taskList);
        this.goHome();
    }

    goHome() {
        this.print.log('Go Home Triggered')
        this.router.navigate(['/']);
    }
}
