import { EventEmitter, inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../config/environment';

@Injectable({
  providedIn: 'root', 
})
export class VideoAnalyzerService {
  private readonly apiUrl =  environment.apiUrl+'analyze/';
  private readonly apiSocketUrl = environment.apiUrlWs+'analyze/upload_video';
  private socket: WebSocket | null = null;
  messageReceived: EventEmitter<any> = new EventEmitter();
  http = inject(HttpClient)

  analyzeVideo(file: File, area: any, portions: any, description: string): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('file1', file);
    formData.append('area', JSON.stringify(area));
    formData.append('portions', JSON.stringify(portions));
    formData.append('description', description);
    return this.http.post<any>(this.apiUrl, formData);
  }

  connectToSocket(connection_uid: string): void {
    if (this.socket) {
      console.warn('Socket already connected');
      return;
    }

    // Inizializza la connessione WebSocket
    this.socket = new WebSocket(`${this.apiSocketUrl}?connection_uid=${connection_uid}`);

    // Gestisci gli eventi del socket
    this.socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleSocketMessage(message);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
      this.socket = null; // Resetta il socket a null quando chiuso
    };
  }

  private handleSocketMessage(message: any) {
    // Gestisci i messaggi ricevuti dal server
    console.log('Message from server:', message);
    // Controlla se ci sono messaggi validi e emetti l'evento
    if (message.message && message.detail) {
      this.messageReceived.emit(message);
    }
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      console.log('WebSocket connection closed');
    }
  }

}
