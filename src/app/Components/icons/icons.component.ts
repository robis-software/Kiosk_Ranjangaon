import { Component, Input } from '@angular/core';

/**
 * IconsComponent
 *
 * A reusable Angular component for displaying SVG-based icons with customizable
 * size and color properties. This component allows you to render icons dynamically
 * by passing icon name and styling parameters.
 *
 * @example
 * <ranjangaon-icons
 *   [icon]="'bell'"
 *   [size]="32"
 *   [color]="'#28A745'"
 * ></ranjangaon-icons>
 *
 * @input icon - The name or identifier of the icon to display
 * @input size - The width and height of the icon in pixels (default: 24)
 * @input color - Hex color code for the icon (e.g., '#28A745', '#FF0000')
 */
@Component({
  selector: 'ranjangaon-icons',
  standalone: true,
  imports: [],
  templateUrl: './icons.component.html',
  styleUrl: './icons.component.css'
})
export class IconsComponent {
  /** The name or identifier of the icon to display */
  @Input() icon: string = '';

  /** The width and height of the icon in pixels */
  @Input() size: number = 24;

  /** Hex color code for the icon fill/stroke */
  @Input() color: string = ''
}
