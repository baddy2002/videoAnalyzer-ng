import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-popUp',
  standalone: true,
  templateUrl: './popUp.component.html'
})
export class PopUpComponent {
  @Input() message: string = '';
  @Output() close = new EventEmitter<void>();
  
  onClose(): void {
    this.close.emit(); // Emette l'evento per chiudere il popup
  }
}
