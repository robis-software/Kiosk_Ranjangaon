import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';

interface Config {
  angle: {start: number, end:number},
  logo: 'battery' | 'speedometer',
  size:number,
  color:string
}

/**
 * CircularIndicatorComponent
 *
 * A reusable Angular component that displays a circular progress indicator with customizable
 * appearance and animation. The component renders an SVG-based circular progress bar that
 * animates based on the provided data value.
 *
 * @example
 * <ranjangaon-circular-indicator
 *   [angle]="90"
 *   [size]="200"
 *   [color]="'#28A745'"
 *   [data]="75"
 *   [rotate]="0"
 * ></ranjangaon-circular-indicator>
 *
 * @input angle - The starting angle in degrees (0-360) for the progress arc
 * @input size - The width and height of the SVG element in pixels
 * @input color - Hex color code for the progress arc (e.g., '#28A745', '#FF0000')
 * @input data - The progress value (0-100) that controls the fill percentage
 * @input rotate - The rotation angle in degrees to rotate the entire SVG element
 */

@Component({
  selector: 'ranjangaon-circular-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './circular-indicator.component.html',
  styleUrl: './circular-indicator.component.css'
})
export class CircularIndicatorComponent implements OnInit, AfterViewInit, OnChanges {
  /** Reference to the SVG indicator element for DOM manipulation */
  @ViewChild('indicator') indicator!: ElementRef<any>;

  /** Starting angle of the progress arc in degrees (0-360) */
  @Input() angle:number = 0;

  /** Width and height of the SVG element in pixels */
  @Input() size: number = 0;

  /** Hex color code for the progress arc fill */
  @Input() color:string = '';

  /** Progress value (0-100) representing the percentage to display */
  @Input() data:number = 0;

  /** Rotation angle in degrees to rotate the entire SVG element */
  @Input() rotate:number = 0

  /** SVG configuration object containing stroke and circle properties */
  svgOptions:any = {
    strokeWidth: 40,
    radius: 100,
    startCircumference: 0,
    endCircumference: 0
  }

  /** Current progress value (synchronized from @Input data) */
  value:number = 0

  constructor() {}

  /**
   * Angular lifecycle hook - Initialize component
   * Calculates the start and end circumference values based on the angle input
   */
  ngOnInit(): void {
    this.svgOptions.startCircumference = this.calculateCircumference(this.angle);
    this.svgOptions.endCircumference = this.calculateCircumference(360);
  }

  /**
   * Angular lifecycle hook - After view initialization
   * Applies the rotation transform to the SVG element
   */
  ngAfterViewInit(): void {
    this.indicator.nativeElement.style.transform = `rotate(${this.rotate}deg)`
  }

  /**
   * Calculates the circumference of the circle for a given angle
   * @param angle - The angle in degrees (0-360)
   * @returns The circumference value as a percentage of the full circle
   */
  calculateCircumference(angle:number):number {
    const angleInPercentage = angle/360;
    return (2* Math.PI * this.svgOptions.radius) * angleInPercentage;
  }

  /**
   * Angular lifecycle hook - Detects input property changes
   * Updates the display value when the data input changes
   * @param changes - Object containing the properties that changed
   */
  ngOnChanges(changes: SimpleChanges): void {
    if(changes['data']) {
      this.value = this.data;
    }
  }
}
