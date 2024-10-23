import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../config/environment';
import { v4 as uuidv4 } from 'uuid'; // Importa il metodo per generare UUID

@Injectable({
  providedIn: 'root'
})
export class WebSocketStreamService {
  private socket!: WebSocket;
  private readonly serverUrl: string = environment.apiUrlWs+'confrontation/keypoints_stream'; 
  private readonly elaboration_uuid: string = uuidv4(); 
  private isCompleted: boolean = false; // Variabile per tracciare lo stato di completamento

  // Subject per inviare i dati al VideoCaptureService
  public keypointsSubject = new Subject<any>();

  constructor() {
    this.connect();
  }

  // Connessione al server WebSocket
  private connect(): void {
    console.log("connecting with: elaboration_uuid: " + this.elaboration_uuid);
    this.socket = new WebSocket(`${this.serverUrl}?elaboration_uuid=${this.elaboration_uuid}`);

    // Gestisci gli eventi WebSocket
    this.socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    this.socket.onmessage = (event) => {
      console.log('Message from server:', event.data);
      const message = JSON.parse(event.data);
      if (message.message === 'completed') {
        console.log('Elaboration completed. Closing connection.');
        this.isCompleted = true;
        this.socket.close(); // Chiudi la connessione WebSocket
      } else {
        this.keypointsSubject.next(message);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.socket.onclose = () => {
        if (!this.isCompleted) {
            console.log('WebSocket connection closed, reconnecting...');
            this.reconnect(); // Tenta la riconnessione
          } else {
            console.log('WebSocket connection closed after completion. No reconnection will be attempted.');
          }
    };
  }

  // Tentativo di riconnessione
  private reconnect(): void {
    setTimeout(() => {
      this.connect();
    }, 5000); // Ritenta ogni 5 secondi
  }

  // Metodo per inviare i landmarks
  public sendLandmarks(landmarks: any, frameNumber: number, uuid: string, is_mirrored: boolean): void {
   
    if (this.socket.readyState === WebSocket.OPEN) {
      const data = {
        frameNumber: frameNumber,
        video_uuid: uuid,
        landmarks: landmarks,
        is_mirrored: is_mirrored
      };
      console.log("sending socket data: " + data)
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not open. Unable to send data.');
    }
  }
}
