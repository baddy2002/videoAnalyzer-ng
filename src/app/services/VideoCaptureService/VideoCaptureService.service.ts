import { HttpClient } from '@angular/common/http'; // Importa HttpClient
import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { FilesetResolver, PoseLandmarker, PoseLandmarkerOptions, DrawingUtils } from '@mediapipe/tasks-vision';
import { error } from 'console';
import { WebSocketStreamService } from '../WebSocketStreamService/WebSocketStreamService';
import { FilteredLandmark, Landmark } from '../../model/Landmark';
import { Subscription } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class VideoCaptureService {
    private poseLandmarker: PoseLandmarker | null = null;
    private videoStream: MediaStream | null = null;
    private lastFrame: string | null = null;
    private keypointsData: Record<number, number[][]> = {}; // Struttura per memorizzare i keypoints
    private apiUrl = 'http://localhost:8000/'
    private keypointsSubscription: Subscription | null = null; // Aggiungi una subscription
    private socketData: any = null;
    private retry: number = 0;

    constructor(
        @Inject(PLATFORM_ID) private platformId: Object,
        private webSocketStreamService: WebSocketStreamService,
        private http: HttpClient
    ) {
        
    }

    private subscribeToKeypoints(): void {
        this.keypointsSubscription = this.webSocketStreamService.keypointsSubject.subscribe((data) => {
            console.log('Dati ricevuti dal WebSocket:', data);


            this.socketData = data
        });
    }

    // disiscrivi quando il servizio non è più necessario
    ngOnDestroy(): void {
        this.keypointsSubscription?.unsubscribe();
    }

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
        numPoses: 1, 
        minPoseDetectionConfidence: 0.5, // Come nel  backend
        minPosePresenceConfidence: 0.5, // Come nel  backend
        minTrackingConfidence: 0.5, // Come nel  backend
        outputSegmentationMasks: true, // Abilita la maschera di segmentazione per un'analisi più dettagliata
      };

    this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, poseLandmarkerOptions);
  }

    // Nuovo metodo per recuperare i keypoints dal server
    async fetchKeypoints(uuid: string): Promise<void> {
        try {
            const response = await this.http.get<Record<number, number[][]>>(`${this.apiUrl}analyze/${uuid}/keypoints`).toPromise();//TODO: aggiungere caricamento
            if(response)
                this.keypointsData = response;
            else 
                console.error("Response from server is undefined: " + response)
        } catch (error) {
            console.error('Errore durante il recupero dei keypoints:', error);
        }
    }

    // Metodo per gestire i risultati del rilevamento pose
    private onResults(results: any, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement, frameNumber: number, uuid: string): void {
        if (results.landmarks) {
            const filteredLandmarks: FilteredLandmark[] = [];

            // Itera sui keypoints del primo set di landmarks
            results.landmarks[0].forEach((kp: Landmark, index: number) => {
                // Controlla se l'indice corrisponde a uno dei keypoints che vuoi analizzare
                filteredLandmarks.push({
                    index: index, // Usa l'indice corrente
                    x: kp.x,
                    y: kp.y,
                    z: kp.z,
                    visibility: kp.visibility
                });
                
            });

            console.log("frameNumber: " + frameNumber);
        
            // Inviare i keypoints filtrati al servizio WebSocket
            if(filteredLandmarks && frameNumber && uuid)
                this.webSocketStreamService.sendLandmarks(filteredLandmarks, frameNumber, uuid);
            
            console.log('Pose landmarks:', results.landmarks);
            if (isPlatformBrowser(this.platformId)) {
                if(canvasElement){

                    const canvasCtx = canvasElement.getContext('2d');

                    // Imposta dimensioni del canvas
                    canvasElement.width = videoElement.videoWidth;
                    canvasElement.height = videoElement.videoHeight;
            
                    // Disegna il frame video
                    if (canvasCtx) {
                        canvasCtx?.clearRect(0, 0, canvasElement.width, canvasElement.height); // Pulisce il canvas prima di disegnare
                        canvasCtx?.drawImage(videoElement, 0, 0);
                        const drawingUtils = new DrawingUtils(canvasCtx);
                        for (const landmark of results.landmarks) {
                      
                            drawingUtils.drawLandmarks(landmark, {
                            radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
                            });
                            console.log("Received socket data:", this.socketData);
                            if(Array.isArray(this.socketData)){
                                for (const data  of this.socketData) {
                                    // Disegna solo le connessioni per il frame corrente
                                    //if (frameNumber === data.frame_number) {
                                        const connectionObj = { start: data.connection[0], end: data.connection[1] }; // Indici dei landmark

                                        // Disegna la connessione tra i landmark con il colore corretto
                                        drawingUtils.drawConnectors(landmark,
                                             [connectionObj], 
                                            {
                                                color: data.color,
                                                lineWidth: 5
                                            });
                                    //}
                                    //else
                                        //console.error("frameNumber è diverso: " + data.frame_number);
                                }
                            }
                        }

                        if (this.keypointsData[frameNumber]) {
                            const keypoints = this.keypointsData[frameNumber];
    
                            // Disegna i keypoints del server
                            for (const keypoint of keypoints) {
                                const index = keypoint[0]; // Indice del keypoint
                                const x = keypoint[1] * canvasElement.width; // Converti in coordinate canvas
                                const y = keypoint[2] * canvasElement.height; // Converti in coordinate canvas
                                const confidence = keypoint[3]; // Affidabilità
    
                                // Disegna il keypoint se ha una certa affidabilità
                                if (confidence > 0.5) {
                                    canvasCtx?.beginPath();
                                    canvasCtx?.arc(x, y, 5, 0, 2 * Math.PI);
                                    canvasCtx.fillStyle = 'blue'; // Colore per keypoints del server
                                    canvasCtx?.fill();
                                }
                            }
    
                            // Connessioni manuali per i keypoints del server
                            const connections = PoseLandmarker.POSE_CONNECTIONS; // Usa le stesse connessioni
                            for (const connection of connections) {
                                const startKeypoint = keypoints.find(kp => kp[0] === connection.start);
                                const endKeypoint = keypoints.find(kp => kp[0] === connection.end);
    
                                if (startKeypoint && endKeypoint) {
                                    const startX = startKeypoint[1] * canvasElement.width;
                                    const startY = startKeypoint[2] * canvasElement.height;
                                    const endX = endKeypoint[1] * canvasElement.width;
                                    const endY = endKeypoint[2] * canvasElement.height;
    
                                    // Disegna la linea di connessione
                                    canvasCtx?.beginPath();
                                    canvasCtx?.moveTo(startX, startY);
                                    canvasCtx?.lineTo(endX, endY);
                                    canvasCtx.strokeStyle = 'blue'; // Colore per connessioni del server
                                    canvasCtx.lineWidth = 5;
                                    canvasCtx?.stroke();
                                }
                            }
                        }
                    }
                }

            }
        }
    }

    // Metodo per avviare lo streaming video e rilevare pose
    async startVideo(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement, uuid: string, fps: number): Promise<void> {
        try {
            // Recupera i keypoints dal server prima di iniziare il video
            await this.fetchKeypoints(uuid);
            this.subscribeToKeypoints(); // Sottoscrivi ai dati ricevuti dal WebSocket
            // Configura le constraint per getUserMedia
            const constraints = {
                video: {
                    facingMode: 'user', // Imposta la telecamera frontale
                    width: { ideal: videoElement.width },
                    height: { ideal: videoElement.height },
                    frameRate: { ideal: fps } // Imposta la frequenza dei frame
                }
            };
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = this.videoStream;

            if (!this.poseLandmarker) {
                await this.initializePoseLandmarker(); // Inizializza il modello se non è ancora stato fatto
            }

            let frameCount = 0;

            const processFrame = async () => {
                console.log("trying to create img with width: " + videoElement.videoWidth + " height: " + videoElement.videoHeight);
                if (this.poseLandmarker && videoElement && videoElement.videoWidth && videoElement.videoHeight && videoElement.readyState >= 2) {
                    try{
                        const imageBitmap = await createImageBitmap(
                            videoElement,  // Sorgente (il video)
                            0, 0,          // sx, sy: coordinate dell'angolo in alto a sinistra
                            this.approximateToDecine(videoElement.videoWidth),  // sw: larghezza del ritaglio (qui usi tutta la larghezza)
                            this.approximateToDecine(videoElement.videoHeight)  // sh: altezza del ritaglio (qui usi tutta l'altezza)
                        );
                        try{
                            const results = this.poseLandmarker.detectForVideo(imageBitmap, performance.now());
                            this.onResults(results, videoElement, canvasElement, frameCount, uuid);  // Gestisci i risultati
                            frameCount++;
                            imageBitmap.close();  // Rilascia memoria bitmap
                        } catch(error: any){
                            console.error('Verifica i parametri:', {
                                imageBitmap: imageBitmap,
                                timestamp: performance.now(),
                                poseLandmarker: this.poseLandmarker,
                            });
                        }

                    }
                    catch(error: any){
                        console.error('Errore durante la creazione dell\'imageBitmap:', error.message);
                        
                        this.retry++;
                        if (this.retry < 10) {
                            setTimeout(() => {
                                requestAnimationFrame(processFrame);
                            }, 100); // Ritardo di 100ms prima di ritentare
                            return;
                        }
                    }
                }
                if(this.retry<10)
                    requestAnimationFrame(processFrame); // Richiama il frame successivo
            };

            requestAnimationFrame(processFrame); // Avvia l'elaborazione del video frame
        } catch (error) {
        console.error('Error accessing the camera:', error);
        }
    }

    approximateToDecine(value: number): number {
        return Math.round(value / 10) * 10;
    }
  // Metodo per fermare lo streaming video
  async stopVideo(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => track.stop());
      this.videoStream = null;
    }
    
    videoElement.srcObject = null;
     

    this.lastFrame = await this.getCanvasImage(canvasElement);

    // Pulisci il canvas
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
