import { Component, ElementRef, AfterViewInit, ViewChild, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FreehandDrawDirective } from '../freehand-draw.directive';
type HandleType = 'nw' | 'ne' | 'sw' | 'se'; // Define allowed handle types
@Component({
  selector: 'app-svg-canvas',
  standalone: true,
  imports: [CommonModule, FreehandDrawDirective],  // Import the directive
  templateUrl: './svg-canvas.component.html',
  styleUrls: ['./svg-canvas.component.css']
})
export class SvgCanvasComponent implements AfterViewInit {
  @ViewChild('svgContainer', { static: true }) svgContainer!: ElementRef;
  @ViewChild('svgElement', { static: true }) svgElement!: ElementRef;
  private panX = 0;
  private panY = 0;
  private scale = 1;
  private isPanning = false;
  private startX = 0;
  private startY = 0;
  drawingMode = false;
  textMode = false;
  private selectedTextElement: SVGTextElement | null = null;
  private resizing = false;
  private originalFontSize = 16;

  

  constructor(private renderer: Renderer2) {}

  

  ngAfterViewInit(): void {
    this.initializePanZoomEvents();
    this.initializeTextEvents();
    this.setupViewBox(); // Set up viewBox for the SVG to handle scaling and panning
  }

  setupViewBox(): void {
    // Set an initial viewBox to manage the SVG's scaling properly
    this.renderer.setAttribute(this.svgElement.nativeElement, 'viewBox', `0 0 1000 1000`);
    this.renderer.setStyle(this.svgElement.nativeElement, 'width', '100%');
    this.renderer.setStyle(this.svgElement.nativeElement, 'height', '100%');
  }

  initializePanZoomEvents(): void {
    const container = this.svgContainer.nativeElement;

    this.renderer.listen(container, 'wheel', (event: WheelEvent) => this.zoom(event));
    this.renderer.listen(container, 'mousedown', (event: MouseEvent) => this.startPan(event));
    this.renderer.listen(container, 'mousemove', (event: MouseEvent) => this.pan(event));
    this.renderer.listen(container, 'mouseup', () => this.endPan());
    this.renderer.listen(container, 'mouseleave', () => this.endPan());
  }

  initializeTextEvents(): void {
    const svgElement = this.svgElement.nativeElement;

    this.renderer.listen(svgElement, 'click', (event: MouseEvent) => {
      if (this.textMode) {
        this.addText(event);
      } else if (event.target instanceof SVGTextElement) {
        this.selectText(event.target);
      }
    });
  }

  zoom(event: WheelEvent): void {
    event.preventDefault();
    const scaleAmount = 0.1;
    this.scale += (event.deltaY > 0 ? -scaleAmount : scaleAmount);
    this.scale = Math.max(0.1, Math.min(4, this.scale)); // Clamp scale between 0.1 and 4

    // Adjust the viewBox to zoom in and out
    const viewBox = this.calculateViewBox();
    this.renderer.setAttribute(this.svgElement.nativeElement, 'viewBox', viewBox);
  }

  startPan(event: MouseEvent): void {
    if (this.drawingMode || this.textMode) return; // Don't pan if drawing or text mode is enabled
    this.isPanning = true;
    this.startX = event.clientX - this.panX;
    this.startY = event.clientY - this.panY;
  }

  pan(event: MouseEvent): void {
    if (!this.isPanning) return;
    this.panX = event.clientX - this.startX;
    this.panY = event.clientX - this.startY;

    // Adjust the viewBox to pan
    const viewBox = this.calculateViewBox();
    this.renderer.setAttribute(this.svgElement.nativeElement, 'viewBox', viewBox);
  }

  endPan(): void {
    this.isPanning = false;
  }

  addText(event: MouseEvent): void {
    const text = prompt('Enter the text to add:');
    if (!text) return;

    const svgText = this.renderer.createElement('text', 'svg');
    const point = this.getSvgPoint(event);
    this.renderer.setAttribute(svgText, 'x', point.x.toString());
    this.renderer.setAttribute(svgText, 'y', point.y.toString());
    this.renderer.setAttribute(svgText, 'fill', '#000');
    this.renderer.setAttribute(svgText, 'font-size', '16'); // Default font size
    svgText.textContent = text;

    this.renderer.appendChild(this.svgElement.nativeElement, svgText);
    this.makeTextResizable(svgText); // Make text resizable
  }

  selectText(element: SVGTextElement): void {
    if (this.selectedTextElement) {
      this.deselectText(); // Deselect any previously selected text
    }

    this.selectedTextElement = element;
    this.originalFontSize = parseFloat(element.getAttribute('font-size') || '16');
    this.renderer.setStyle(element, 'cursor', 'move');

    // Add resize handles
    this.addResizeHandles(element);
  }

  deselectText(): void {
    if (this.selectedTextElement) {
      this.removeResizeHandles(this.selectedTextElement);
      this.renderer.setStyle(this.selectedTextElement, 'cursor', 'text');
      this.selectedTextElement = null;
    }
  }

  makeTextResizable(textElement: SVGTextElement): void {
    this.renderer.listen(textElement, 'mousedown', (event: MouseEvent) => {
      if (event.target !== textElement) return;
      this.resizing = true;
      const startX = event.clientX;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (this.resizing && this.selectedTextElement) {
          const dx = moveEvent.clientX - startX;
          const newSize = Math.max(this.originalFontSize + dx / 2, 5); // Minimum font size is 5
          this.renderer.setAttribute(this.selectedTextElement, 'font-size', newSize.toString());
        }
      };

      const onMouseUp = () => {
        this.resizing = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  addResizeHandles(textElement: SVGTextElement): void {
    const bbox = textElement.getBBox();
    const handles: HandleType[] = ['nw', 'ne', 'sw', 'se'];

    handles.forEach((handle) => {
      const rect = this.renderer.createElement('rect', 'svg');
      this.renderer.setAttribute(rect, 'width', '8');
      this.renderer.setAttribute(rect, 'height', '8');
      this.renderer.setAttribute(rect, 'fill', 'blue');

      const { x, y } = this.getHandlePosition(handle, bbox);
      this.renderer.setAttribute(rect, 'x', x.toString());
      this.renderer.setAttribute(rect, 'y', y.toString());

      this.renderer.appendChild(this.svgElement.nativeElement, rect);

      this.renderer.listen(rect, 'mousedown', (event: MouseEvent) => this.startResize(event, textElement, handle));
    });
  }

  getHandlePosition(handle: HandleType, bbox: DOMRect): { x: number; y: number } {
    const positions: Record<HandleType, { x: number; y: number }> = {
      nw: { x: bbox.x - 4, y: bbox.y - 4 },
      ne: { x: bbox.x + bbox.width - 4, y: bbox.y - 4 },
      sw: { x: bbox.x - 4, y: bbox.y + bbox.height - 4 },
      se: { x: bbox.x + bbox.width - 4, y: bbox.y + bbox.height - 4 },
    };
    return positions[handle];
  }

  removeResizeHandles(textElement: SVGTextElement): void {
    const handles = this.svgElement.nativeElement.querySelectorAll('rect');
    handles.forEach((handle: SVGRectElement) => {
      this.renderer.removeChild(this.svgElement.nativeElement, handle);
    });
  }

  startResize(event: MouseEvent, textElement: SVGTextElement, handle: string): void {
    event.stopPropagation();
    this.resizing = true;
    const startX = event.clientX;
    const startY = event.clientY;
    const originalFontSize = parseFloat(textElement.getAttribute('font-size') || '16');

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (this.resizing) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const newSize = Math.max(originalFontSize + Math.sqrt(dx * dx + dy * dy) / 4, 5); // Minimum font size is 5
        this.renderer.setAttribute(textElement, 'font-size', newSize.toString());
        this.updateResizeHandles(textElement);
      }
    };

    const onMouseUp = () => {
      this.resizing = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  updateResizeHandles(textElement: SVGTextElement): void {
    const bbox = textElement.getBBox();
    const handles = this.svgElement.nativeElement.querySelectorAll('rect');

    handles.forEach((handle: SVGRectElement, index: number) => {
      const handleType = ['nw', 'ne', 'sw', 'se'][index] as HandleType;
      const { x, y } = this.getHandlePosition(handleType, bbox);
      this.renderer.setAttribute(handle, 'x', x.toString());
      this.renderer.setAttribute(handle, 'y', y.toString());
    });
  }

  private getSvgPoint(event: MouseEvent): { x: number, y: number } {
    const svg = this.svgElement.nativeElement as SVGSVGElement;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM()?.inverse());
  }

  toggleDrawingMode(): void {
    this.drawingMode = !this.drawingMode;
    this.textMode = false; // Disable text mode if drawing mode is enabled
  }

  toggleTextMode(): void {
    this.textMode = !this.textMode;
    this.drawingMode = false; // Disable drawing mode if text mode is enabled
  }

  private calculateViewBox(): string {
    // Calculate the new viewBox based on pan and zoom
    const width = 1000 / this.scale;
    const height = 1000 / this.scale;
    const x = -this.panX / this.scale;
    const y = -this.panY / this.scale;
    return `${x} ${y} ${width} ${height}`;
  }
}
