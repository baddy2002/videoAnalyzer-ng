import { Component } from '@angular/core';
import { VideoAnalyzerService } from './analyzeFormRequest.service';
import { FormsModule } from '@angular/forms';
import { PopUpComponent } from '../../common/popUpResponse/popUp.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormComponent } from '../../common/form/FormComponent.component';
import { InputComponent } from '../../common/input/inputComponent.component';
import { InputConfig } from '../../../model/inputConfig';
import { HeaderComponent } from '../../common/header/header.component';
import { FooterComponent } from '../../common/footer/footer.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-video-analyzer',
  standalone: true,
  imports: [FormsModule, PopUpComponent, CommonModule, FormComponent, HeaderComponent, FooterComponent],
  templateUrl: './analyzeFormRequest.component.html',
})
export class VideoAnalyzerComponent {
  selectedFile: File | null = null;
  serverResponse: string = '';
  serverResponseDetail: string = '';
  showPopup: boolean = false;

  // Configurazione degli input
  inputsConfig: (InputComponent | InputConfig)[] = [
    { 
      type: 'file', 
      id: 'video', 
      name: 'file1', 
      ngModel: '', 
      required: true, 
      inputClass: 'mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm', 
      isFileInput: true, // per gestire il tipo file
    },
    { type: 'number', id: 'dx', name: 'dx', ngModel: 0.8, required: true, inputClass: "mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm", isFileInput: false},
    { type: 'number', id: 'sx', name: 'sx', ngModel: 0.2, required: true, inputClass: "mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm", isFileInput: false },
    { type: 'number', id: 'head', name: 'head', ngModel: 0, required: true, inputClass: "mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm",isFileInput: false },
    { type: 'number', id: 'body', name: 'body', ngModel: 0.2, required: true, inputClass:"mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm",isFileInput: false },
    { type: 'number', id: 'feets', name: 'feets', ngModel: 0, required: true, inputClass: "mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm",isFileInput: false },
    { type: 'number', id: 'hands', name: 'hands', ngModel: 0.1, required: true, inputClass: "mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm",isFileInput: false },
    { type: 'number', id: 'arms', name: 'arms', ngModel: 0.7, required: true, inputClass: "mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm",isFileInput: false },
    { type: 'number', id: 'legs', name: 'legs', ngModel: 0, required: true, inputClass: "mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm",isFileInput: false},
    { type: 'text', id: 'description', name: 'description', ngModel: '', required: true, inputClass: "mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm",isFileInput: false},
  ];

  constructor(private readonly videoAnalyzerService: VideoAnalyzerService, private readonly router: Router) {}

  ngOnInit() {
    // Sottoscrivi all'evento di messaggio ricevuto
    this.videoAnalyzerService.messageReceived.subscribe((message: any) => {
      this.serverResponse = message.message;
      this.serverResponseDetail = message.detail;
      this.showPopup = true; // Mostra il popup quando arriva un messaggio
    });
  }


    
  navigateTo(link: string) {
      this.router.navigate(['/'+link])
  }
  onValueChange(value: any): void {
    console.log("videoAnalyzer");
    console.log(value);
    if (value?.type && (value.type as string).includes('video') && value.size > 0) {
        this.selectedFile = value; // Aggiorna solo il file se l'input è un file
    } else {
      // Gestisci gli altri valori degli input
      console.log(`${value.type}: ${value}`);
      // Aggiorna la logica per memorizzare il valore nel tuo stato
    }
  }

  onSubmit() {
    const area = {
      dx: this.inputsConfig.find(input => input.id === 'dx')?.ngModel,
      sx: this.inputsConfig.find(input => input.id === 'sx')?.ngModel,
    };
    const portions = {
      head: this.inputsConfig.find(input => input.id === 'head')?.ngModel,
      body: this.inputsConfig.find(input => input.id === 'body')?.ngModel,
      feets: this.inputsConfig.find(input => input.id === 'feets')?.ngModel,
      hands: this.inputsConfig.find(input => input.id === 'hands')?.ngModel,
      arms: this.inputsConfig.find(input => input.id === 'arms')?.ngModel,
      legs: this.inputsConfig.find(input => input.id === 'legs')?.ngModel,
    };
    const description = this.inputsConfig.find(input => input.id === 'description')?.ngModel;

    if (this.selectedFile) {
      this.videoAnalyzerService.analyzeVideo(this.selectedFile, area, portions,  description? description as string: '').subscribe({
        next: (response) => {
          this.serverResponse = response.message;
          if(response.detail)
            this.videoAnalyzerService.connectToSocket(response.detail)
          this.showPopup = true;
        },
        error: (error: HttpErrorResponse) => {
          this.serverResponse = error.error.message || 'Impossibile recuperare codice errore, per favore riprovare';
          this.showPopup = true;
        },
        complete: () => {
          console.log('Richiesta completata');
        }
      });
    } else {
      this.serverResponse = 'Nessun file selezionato!';
      this.showPopup = true;
    }
  }

  onClosePopup(): void {
    this.showPopup = false;
  }

}
