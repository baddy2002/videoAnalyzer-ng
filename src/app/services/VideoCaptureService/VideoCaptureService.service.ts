import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { FilesetResolver, PoseLandmarker, PoseLandmarkerOptions, DrawingUtils } from '@mediapipe/tasks-vision';



@Injectable({
  providedIn: 'root'
})
export class VideoCaptureService {
    private poseLandmarker: PoseLandmarker | null = null;
  private videoStream: MediaStream | null = null;
  private lastFrame: string | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  // Metodo per inizializzare il modello di pose
  async initializePoseLandmarker(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    const poseLandmarkerOptions: PoseLandmarkerOptions = {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task`, // Usa il modello completo per una migliore accuratezza
        },
        runningMode: 'VIDEO',
        numPoses: 1, // Mantieni 1 se desideri rilevare solo una posa
        minPoseDetectionConfidence: 0.5, // Come nel tuo backend
        minPosePresenceConfidence: 0.5, // Come nel tuo backend
        minTrackingConfidence: 0.5, // Come nel tuo backend
        outputSegmentationMasks: true, // Abilita la maschera di segmentazione per un'analisi più dettagliata
      };

    this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, poseLandmarkerOptions);
  }

  // Metodo per gestire i risultati del rilevamento pose
  private onResults(results: any, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): void {
    if (results.landmarks) {
      console.log('Pose landmarks:', results.landmarks);
      if (isPlatformBrowser(this.platformId)) {
        if(canvasElement){
            const canvasCtx = canvasElement.getContext('2d');

            // Imposta dimensioni del canvas
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
    
            // Disegna il frame video
            canvasCtx?.clearRect(0, 0, canvasElement.width, canvasElement.height); // Pulisce il canvas prima di disegnare
            canvasCtx?.drawImage(videoElement, 0, 0);
            if (canvasCtx) {
              const drawingUtils = new DrawingUtils(canvasCtx);
              for (const landmark of results.landmarks) {
                drawingUtils.drawLandmarks(landmark, {
                  radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
                });
                drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
              }
            }
        }

      }
    }
  }

  // Metodo per avviare lo streaming video e rilevare pose
  async startVideo(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> {
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElement.srcObject = this.videoStream;

      if (!this.poseLandmarker) {
        await this.initializePoseLandmarker(); // Inizializza il modello se non è ancora stato fatto
      }

      const processFrame = async () => {
        if (this.poseLandmarker && videoElement && videoElement.videoWidth && videoElement.videoHeight) {
            try{
                const imageBitmap = await createImageBitmap(videoElement);
                const results = this.poseLandmarker.detectForVideo(imageBitmap, performance.now());
                this.onResults(results, videoElement, canvasElement);  // Gestisci i risultati
                imageBitmap.close();  // Rilascia memoria bitmap
            }
            catch(error){
                console.error('Errore durante la creazione dell\'imageBitmap:', error);
            }
        }
        requestAnimationFrame(processFrame); // Richiama il frame successivo
      };

      requestAnimationFrame(processFrame); // Avvia l'elaborazione del video frame
    } catch (error) {
      console.error('Error accessing the camera:', error);
    }
  }

  // Metodo per fermare lo streaming video
  async stopVideo(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => track.stop());
      this.videoStream = null;
    }
    
    videoElement.srcObject = null;
     

    this.lastFrame = await this.getCanvasImage(canvasElement);

    // Pulisci il canvas (opzionale)
    const context = canvasElement.getContext('2d');
    if (context) {
        context.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
  }

  // Metodo per ottenere l'ultimo frame elaborato
  getLastFrame(): string | null {
    return this.lastFrame;
  }

  // Metodo per ottenere l'immagine del canvas come stringa base64
  private getCanvasImage(canvasElement: HTMLCanvasElement): Promise<string | null> {
    return new Promise((resolve) => {
        const canvas = canvasElement; // Assicurati di avere un modo per ottenere il canvas
        if (canvas) {
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        } else {
            resolve(null);
        }
    });
    }
  
}
