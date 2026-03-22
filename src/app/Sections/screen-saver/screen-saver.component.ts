import { Component } from '@angular/core';
import { colors } from '../../Utils/colors';

@Component({
  selector: 'ranjangaon-screen-saver',
  standalone: true,
  imports: [],
  templateUrl: './screen-saver.component.html',
  styleUrl: './screen-saver.component.css'
})
export class ScreenSaverComponent {
  colors:any = colors
}
