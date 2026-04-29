import { Component } from '@angular/core';
import { IconsComponent } from "../../../Components/icons/icons.component";
import { RouterLink } from "@angular/router";
import { TitleComponent } from "../../../Components/title/title.component";
import { IllustrationsComponent } from "../../../Components/illustrations/illustrations.component";

@Component({
  selector: 'ranjangaon-location',
  standalone: true,
  imports: [IconsComponent, RouterLink, TitleComponent, IllustrationsComponent],
  templateUrl: './location.component.html',
  styleUrl: './location.component.css'
})
export class LocationComponent {

}
