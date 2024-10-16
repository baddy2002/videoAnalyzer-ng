import { WebSocketSubject } from 'rxjs/webSocket';

export class VideoStreamComponent {
  private ws: WebSocketSubject<any>;

  constructor() {
    this.ws = new WebSocketSubject('ws://localhost:8000/ws/video_stream');
  }

  streamVideo(videoElement: HTMLVideoElement) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const sendFrame = () => {
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        context?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Estrae il frame come blob
        canvas?.toBlob(blob => {
          const reader = new FileReader();
          if (blob){
            reader.readAsArrayBuffer(blob);
            reader.onloadend = () => {
              const arrayBuffer = reader.result as ArrayBuffer;
              this.ws.next(arrayBuffer);  // Invio frame al backend
            };
          }
        }, 'image/jpeg');
      }
      requestAnimationFrame(sendFrame);  // Continua l'invio dei frame
    };

    sendFrame();  // Inizia lo streaming
  }
}
