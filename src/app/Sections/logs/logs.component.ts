import { Component, OnInit } from '@angular/core';
import { IconsComponent } from "../../Components/icons/icons.component";
import { TitleComponent } from "../../Components/title/title.component";
import { Router, RouterLink } from "@angular/router";
import Print from '../../Utils/print';
import { SessionStorageService } from '../../Services/session-storage.service';
import { ApiService } from '../../Services/api.service';
import { colors } from '../../Utils/colors';

@Component({
  selector: 'ranjangaon-logs',
  standalone: true,
  imports: [IconsComponent, TitleComponent, RouterLink],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.css'
})
export class LogsComponent implements OnInit {
    print!:Print;
    colors:any;

    logs:any[] = [];

    constructor(private readonly ss:SessionStorageService, private readonly api:ApiService, private readonly router:Router) {
        this.print = new Print();
        this.colors = colors;
    };

    ngOnInit(): void {
        const isAuthenicated = this.ss.getItem('_authenication');

        if(isAuthenicated) {
            //Api Call
            this.fetchLogsList();
        }
        else {
            this.router.navigate(['/logs'])
        }
    }

    private fetchLogsList() {
        this.api.get('logs', {}).subscribe({
            next: (response:any) => {
                this.print.log(response);
                this.logs = response.data
            },
            error: (error:any) => {
                this.print.error('While fetching Logs',error);
            }
        })
    }
}
