import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
/**
 * `Author:`
 * `Vigneswara Gopalsamy`
 * ||
 * `Date:`
 * `03/10/2025`
 *
 * Loading UI Component
 * Used to display a loading spinner or indicator
 *
 * @example <fleet-loading-ui></fleet-loading-ui>
 */

@Component({
  selector: 'fleet-loading-ui',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-ui.component.html',
  styleUrl: './loading-ui.component.css'
})
export class LoadingUiComponent{
}
