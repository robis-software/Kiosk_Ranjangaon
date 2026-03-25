import { Component, OnDestroy, OnInit } from '@angular/core';
import { IllustrationsComponent } from "../../Components/illustrations/illustrations.component";
import { Router } from '@angular/router';
import { SseService } from '../../Services/sse.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ranjangaon-disconnected',
  standalone: true,
  imports: [IllustrationsComponent],
  templateUrl: './disconnected.component.html',
  styleUrl: './disconnected.component.css'
})
export class DisconnectedComponent implements OnInit, OnDestroy {

    private subscription!: Subscription;

    constructor(private readonly router:Router, private readonly liveStream:SseService) {}

    ngOnInit(): void {
        this.monitorStatus();
    }

    private monitorStatus() {
        this.subscription = this.liveStream.serverEvent$.subscribe((data:any) => {
            if(data !== null && data !== undefined && JSON.stringify(data) !== '{}' && data.live === true) {
                this.router.navigateByUrl('/');
            }
        });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
