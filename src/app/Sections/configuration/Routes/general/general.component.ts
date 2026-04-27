import { Component } from '@angular/core';
import { IconsComponent } from "../../../../Components/icons/icons.component";

@Component({
  selector: 'ranjangaon-general',
  standalone: true,
  imports: [IconsComponent],
  templateUrl: './general.component.html',
  styleUrl: './general.component.css'
})
export class GeneralComponent {
    colors:any;
}
