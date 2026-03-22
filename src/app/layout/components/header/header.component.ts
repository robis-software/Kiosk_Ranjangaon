import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IconsComponent } from "../../../Components/icons/icons.component";
import { Router} from "@angular/router";
import Print from '../../../Utils/print';
import { colors } from '../../../Utils/colors';
import { SessionStorageService } from '../../../Services/session-storage.service';
import { SseService } from '../../../Services/sse.service';

@Component({
  selector: 'ranjangaon-header',
  standalone: true,
  imports: [CommonModule, IconsComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})

export class HeaderComponent implements OnInit {
    print!:Print;
    colors:any;

    liveData:any;
    config:any;

    constructor(private readonly ss:SessionStorageService, private readonly router:Router, private readonly stream:SseService){
        this.print = new Print();
        this.colors = colors;
    }

    ngOnInit(): void {
        this.stream.serverEvent$.subscribe((data:any)=> {
            this.liveData = data;
            // this.print.log('From Header =>', this.liveData)
        })
        this.recursiveTry();
    }

    private recursiveTry() {
        this.config = this.ss.getItem('_config');
        this.print.log('Recursive Trying....');
        if(this.config) {
            return
        }
        else {
            setTimeout(()=> {
                this.recursiveTry();
            },100)
        }
    }

    goToLogs() {
        const isAuthenicated = this.ss.getItem('_authenication');
        if(isAuthenicated) {
            this.print.log('Already in logs');
        }
        else {
            this.router.navigate(['/logs'])
        }
    }

}
