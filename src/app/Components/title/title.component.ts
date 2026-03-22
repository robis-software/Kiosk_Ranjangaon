import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * `Author:`
 * `Vigneswara Gopalsamy`
 * ||
 * `Date:`
 * `11/09/2025`
 *
 * Title Component for displaying a title and subtitle.
 *
 * @param title:string - The main title text.
 * @param subTitle:string - The subtitle text.
 * @param type: 1 | 2 | 3 - The type of title (1 for  title Style 1, 2 for title Style 2).
 *
 * @example
 * <fleet-title [title]="'Main Title'" [subTitle]="'Sub Title'" [type]="1"></fleet-title>
 */

@Component({
  selector: 'fleet-title',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './title.component.html'
})
export class TitleComponent {
  @Input() title: string = '';
  @Input() subTitle:string = '';
  @Input() type:number = 1;
  @Input() wave:boolean = false
}
