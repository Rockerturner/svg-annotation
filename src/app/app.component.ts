import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SvgCanvasComponent } from './svg-canvas/svg-canvas.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SvgCanvasComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'svg-drawing';
}
