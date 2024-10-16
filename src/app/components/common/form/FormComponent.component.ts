import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InputComponent } from '../input/inputComponent.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputConfig } from '../../../model/inputConfig';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [InputComponent, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './FormComponent.component.html',
})
export class FormComponent {
  @Input() enctype: string = 'multipart/form-data';
  @Input() formClass: string = 'space-y-6 bg-white p-8 rounded-lg shadow-lg max-w-lg mx-auto';
  @Input() inputsConfig: (InputComponent | InputConfig)[] = [];
  @Input() buttonText: string = 'Invia';
  @Input() buttonClass: string = 'w-full md:w-auto px-6 py-2 mt-6 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2';

  @Output() submitEvent = new EventEmitter();
  @Output() ngModelChange = new EventEmitter<any>();
  
  onValueChange(event: Event): void {
    console.log(event);
    this.ngModelChange.emit(event); // Emittiamo event degli input
    
  }
  onSubmit() {
    this.submitEvent.emit();
  }
}
