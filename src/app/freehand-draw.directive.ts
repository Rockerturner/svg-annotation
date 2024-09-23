import { Directive, ElementRef, Renderer2, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[FreehandDrawDirective]',
  standalone: true,
})
export class FreehandDrawDirective {
  @Input() isDrawingEnabled = false;  // Control drawing mode
  private drawing = false;
  private currentPath!: SVGPathElement;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (!this.isDrawingEnabled) return; // Exit if drawing mode is not enabled
    this.drawing = true;
    this.currentPath = this.renderer.createElement('path', 'svg');
    this.renderer.setAttribute(this.currentPath, 'fill', 'none');
    this.renderer.setAttribute(this.currentPath, 'stroke', '#000');
    this.renderer.setAttribute(this.currentPath, 'stroke-width', '2');
    this.renderer.appendChild(this.el.nativeElement, this.currentPath);

    const point = this.getSvgPoint(event);
    this.renderer.setAttribute(this.currentPath, 'd', `M${point.x},${point.y}`);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.drawing || !this.isDrawingEnabled) return;
    const point = this.getSvgPoint(event);
    const d = this.currentPath.getAttribute('d') + ` L${point.x},${point.y}`;
    this.renderer.setAttribute(this.currentPath, 'd', d);
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  onMouseUpOrLeave(): void {
    this.drawing = false;
  }

  private getSvgPoint(event: MouseEvent): { x: number, y: number } {
    const svg = this.el.nativeElement as SVGSVGElement;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM()?.inverse());
  }
}
