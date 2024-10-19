import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketStreamService {
  private socket!: WebSocket;
  private readonly serverUrl: string = 'ws://localhost:8000/confrontation/keypoints_stream'; // Cambia con l'URL del tuo server WebSocket

  // Subject per inviare i dati al VideoCaptureService
  public keypointsSubject = new Subject<any>();

  constructor() {
    this.connect();
  }

  // Connessione al server WebSocket
  private connect(): void {
    this.socket = new WebSocket(this.serverUrl);

    // Gestisci gli eventi WebSocket
    this.socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    this.socket.onmessage = (event) => {
      console.log('Message from server:', event.data);
      this.keypointsSubject.next(JSON.parse(event.data));

    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed, reconnecting...');
      this.reconnect(); // Tenta la riconnessione
    };
  }

  // Tentativo di riconnessione
  private reconnect(): void {
    setTimeout(() => {
      this.connect();
    }, 5000); // Ritenta ogni 5 secondi
  }

  // Metodo per inviare i landmarks
  public sendLandmarks(landmarks: any, frameNumber: number, uuid: string): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      const data = {
        frameNumber: frameNumber,
        video_uuid: uuid,
        landmarks: landmarks
      };
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not open. Unable to send data.');
    }
  }
}
