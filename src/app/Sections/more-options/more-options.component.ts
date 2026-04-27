import { Component } from '@angular/core';
import { TitleComponent } from "../../Components/title/title.component";
import { IconsComponent } from "../../Components/icons/icons.component";
import { RouterLink } from "@angular/router";

@Component({
  selector: 'ranjangaon-more-options',
  standalone: true,
  imports: [TitleComponent, IconsComponent, RouterLink],
  templateUrl: './more-options.component.html',
  styleUrl: './more-options.component.css'
})
export class MoreOptionsComponent {

}
