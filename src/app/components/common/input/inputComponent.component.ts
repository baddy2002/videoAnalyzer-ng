import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './InputComponent.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  @Input() type: string = 'text';
  @Input() id: string = '';
  @Input() name: string = '';
  @Input() ngModel: any;
  @Input() required: boolean = false;
  @Input() inputClass: string = '';
  @Input() isFileInput: boolean = false;

  // Aggiungere ngModelChange per sincronizzare i valori
  @Output() ngModelChange = new EventEmitter<any>();

    // Metodo per gestire il cambio file
    onFileChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
        console.log("emit the file: " + input.files[0].name);
        this.ngModelChange.emit(input.files[0]); // Emittiamo il file
        } else {
        this.ngModelChange.emit(null); // Emittiamo null se nessun file è selezionato
        }
    }

  
    // Funzioni per il ControlValueAccessor
    value: any;
    onChange: ((value: any) => void) | undefined;
    onTouched: (() => void) | undefined;
  
    writeValue(value: any): void {
      this.value = value;
    }
  
    registerOnChange(fn: any): void {
      this.onChange = fn;
    }
  
    registerOnTouched(fn: any): void {
      this.onTouched = fn;
    }
}
