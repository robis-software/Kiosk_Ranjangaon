import { Component } from '@angular/core';
import { TitleComponent } from "../../Components/title/title.component";
import { IconsComponent } from "../../Components/icons/icons.component";
import { Router, RouterLink, RouterOutlet } from "@angular/router";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ranjangaon-configuration',
  standalone: true,
  imports: [TitleComponent, IconsComponent, RouterLink, CommonModule, RouterOutlet],
  templateUrl: './configuration.component.html',
  styleUrl: './configuration.component.css'
})
export class ConfigurationComponent {

    constructor(private readonly router:Router) {}

    private getURL() {
        const URL = this.router.url;
        return URL.split("?")[0];
    }

    isGeneralActive(): boolean {
        const filteredURL = this.getURL()
        return filteredURL === '/configuration';
    }

    isLocationsActive(): boolean {
        const filteredURL = this.getURL()
        return filteredURL === '/configuration/location';
    }
}
