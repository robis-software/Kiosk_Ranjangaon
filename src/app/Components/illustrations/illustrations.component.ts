import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * `Author:`
 * `Vigneswara Gopalsamy`
 * ||
 * `Date:`
 * `24/09/2025`
 *
 * Used to place illustration of an required size.
 *
 * @param illustration: string - send the illustration that is needed
 * @param size: number - send the illustration's size in px (default => 300)
 *
 * @example <fleet-illustrations [illustration]='' [size]=''></fleet-illustrations>
 */

@Component({
  selector: 'fleet-illustrations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './illustrations.component.html'
})
export class IllustrationsComponent {
  @Input() illustration:string = '';
  @Input() size:number = 300;
}
