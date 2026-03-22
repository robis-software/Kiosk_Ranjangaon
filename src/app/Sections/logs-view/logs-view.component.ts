import { Component, OnInit } from '@angular/core';
import Print from '../../Utils/print';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { colors } from '../../Utils/colors';
import { IconsComponent } from "../../Components/icons/icons.component";
import { ApiService } from '../../Services/api.service';
import { IllustrationsComponent } from "../../Components/illustrations/illustrations.component";

@Component({
  selector: 'ranjangaon-logs-view',
  standalone: true,
  imports: [IconsComponent, RouterLink, IllustrationsComponent],
  templateUrl: './logs-view.component.html',
  styleUrl: './logs-view.component.css'
})
export class LogsViewComponent implements OnInit {
    print!:Print;
    colors:any;

    fileName:any;

    logsInFile:any[] = [];

    currentTimeInHours:number = 0;

    private waitTimer:any;

    constructor(private readonly route:ActivatedRoute, private readonly api:ApiService) {
        this.print = new Print();
        this.colors = colors;
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        this.fileName = id;
        this.currentTimeInHours = new Date().getHours();
        this.print.log(this.timeFormatter(this.currentTimeInHours) , '=>', this.timeFormatter(this.currentTimeInHours+1));
        this.fetchLogs(this.currentTimeInHours);
    }

    private fetchLogs(time:number) {
        // Testing Payload
        this.api.get(`logs/v2/${this.fileName}.log/${this.timeFormatter(time)}`,{}).subscribe({
            next: (response:any) => {
                this.print.log(response);
                this.logsInFile = response.data;
            },
            error: (error:any) => {
                this.print.error(error);
            }
        })
    }

    timeFormatter(time:number | string) {

        if(time === 24) {
            time = 0
        }

        return String(time).padStart(2, '0') + ':00'
    }

    changeTime(method:string) {
        // Clears the timer, if input is given faster
        clearTimeout(this.waitTimer);
        this.logsInFile.length = 0;

        if(method === 'incr') this.currentTimeInHours += 1;
        else if (method === 'decr') this.currentTimeInHours -=1

        if(this.currentTimeInHours > 23) {
            this.currentTimeInHours = 0
        }

        if(this.currentTimeInHours <= -1) {
            this.currentTimeInHours = 23
        }

        // If the user changes the input, it takes a second to check the user is not giving any other input, it reduces the frequent API Call
        this.waitTimer = setTimeout(()=> {
            this.fetchLogs(this.currentTimeInHours)
        }, 500)
    }
}
