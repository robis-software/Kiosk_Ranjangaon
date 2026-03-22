import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconsComponent } from "../icons/icons.component";
import { colors } from '../../Utils/colors';

/**
 * `Author:`
 * `Vigneswara Gopalsamy`
 * ||
 * `Date:`
 * `11/09/2025`
 *
 * Popup component for displaying information overlays.
 *
 * @param title {string} - The title text displayed in the popup.
 * @param subTitle {string} - The subtitle text displayed in the popup.
 * @param width {string} - The width of the popup (default: '400px').
 *
 * @example <fleet-popup (view)='function() => boolean' [title]="'Popup Title'" [subTitle]="'Popup Subtitle'" [width]="'500px'"></fleet-popup>
 */

@Component({
  selector: 'fleet-popup',
  standalone: true,
  imports: [CommonModule, IconsComponent],
  templateUrl: './popup.component.html'
})
export class PopupComponent {
  @Input() title: string = '';
  @Input() isClose: boolean = true;
  @Input() width: string = '560px';

  @Output() view  = new EventEmitter<any>();

  colors:any;

  constructor() {
    this.colors = colors;
  }
}
