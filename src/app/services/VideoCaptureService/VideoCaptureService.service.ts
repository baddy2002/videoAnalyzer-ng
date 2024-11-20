import { HttpClient } from '@angular/common/http'; // Importa HttpClient
import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { FilesetResolver, PoseLandmarker, PoseLandmarkerOptions, DrawingUtils } from '@mediapipe/tasks-vision';
import { error } from 'console';
import { WebSocketStreamService } from '../WebSocketStreamService/WebSocketStreamService';
import { FilteredLandmark, Landmark } from '../../model/Landmark';
import { BehaviorSubject, Subscription } from 'rxjs';
import { environment } from '../../../config/environment';
import { ConnectionData } from '../../model/ConnectionData';
import { KeypointsStateService } from './KeypointsStateService';


@Injectable({
  providedIn: 'root'
})
export class VideoCaptureService {
    private poseLandmarker: PoseLandmarker | null = null;
    private videoStream: MediaStream | null = null;
    private lastFrame: string | null = null;
    private keypointsData: Record<number, number[][]> = {}; // Struttura per memorizzare i keypoints
    private readonly apiUrl = environment.apiUrl
    private keypointsSubscription: Subscription | null = null; // Aggiungi una subscription
    private socketData: any = null;
    private retry: number = 0;
    private videoElement!: HTMLVideoElement;
    private fps: number = 0;
    private allConnectionsGreen: Boolean = false;
    private readonly userInBoxSubject = new BehaviorSubject<boolean>(true); // Valore iniziale
    userInBox$ = this.userInBoxSubject.asObservable(); // Observable pubblico  

    setUserInBox(value: boolean): void {
        this.userInBoxSubject.next(value); // Aggiorna il valore
    }
    
    checkUserInBox(): void {
        let socketFirstData = (this.socketData?.at(0) as ConnectionData)
        const inBox  =socketFirstData?.in_box;
        if(inBox){
            this.setUserInBox(inBox); // Aggiorna lo stato
        } else {
            this.setUserInBox(false); // Metti falso
        }     
        console.log(inBox ? 'The user is in the box!' : 'The user is not in the box');
    }

    constructor(
        @Inject(PLATFORM_ID) private readonly platformId: Object,
        private readonly webSocketStreamService: WebSocketStreamService,
        private readonly http: HttpClient,
        private readonly keypointsStateService: KeypointsStateService,
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
            const response = await this.http.get<Record<number, number[][]>>(`${this.apiUrl}analyze/${uuid}/keypoints`).toPromise();
            if(response){
                this.keypointsData = response;
                this.keypointsStateService.setKeypoints(this.keypointsData);
            }
            else 
                console.error("Response from server is undefined: " + response)
        } catch (error) {
            console.error('Errore durante il recupero dei keypoints:', error);
        }
    }

    // Metodo per gestire i risultati del rilevamento pose
    private onResults(results: any, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement, frameNumber: number, uuid: string, is_mirrored: boolean): void {
        
        if (results.landmarks && results.landmarks[0]) {
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
                this.webSocketStreamService.sendLandmarks(filteredLandmarks, frameNumber, uuid, is_mirrored);
            
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

                            if(Array.isArray(this.socketData) && this.socketData.length > 0){
                                if(this.socketData?.every((data: ConnectionData) => data.color === "#00FF00")){
                                    this.allConnectionsGreen=true;
                                    console.log("all connection are green");
                                } 
                                this.checkUserInBox();
                                
                                for (const data  of this.socketData) {
                                    const connectionObj = { start: data.connection[0], end: data.connection[1] }; // Indici dei landmark

                                    // Disegna la connessione tra i landmark con il colore corretto
                                    drawingUtils.drawConnectors(landmark,
                                            [connectionObj], 
                                        {
                                            color: data.color,
                                            lineWidth: 5
                                        });
                                    
                                        

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
            let is_mirrored: boolean | null = null
            if (videoElement && canvasElement)
                is_mirrored = await this.openPopUp();
            this.fps = fps;
            const constraints = {
                video: {
                    facingMode: 'user', // Imposta la telecamera frontale
                    width: { ideal: videoElement.width },
                    height: { ideal: videoElement.height },
                    frameRate: { ideal: this.fps } // Imposta la frequenza dei frame
                }
            };
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = this.videoStream;

            if (!this.poseLandmarker) {
                await this.initializePoseLandmarker(); // Inizializza il modello se non è ancora stato fatto
            }

            let frameCount = 25;        //saltare più o meno un secondo del video
            this.videoElement = videoElement;

            const processFrame = async () => {
                console.log("trying to create img with width: " + videoElement.videoWidth + " height: " + videoElement.videoHeight);
                if (this.poseLandmarker && this.videoElement && this.videoElement.videoWidth && this.videoElement.videoHeight && this.videoElement.readyState >= 2) {
                    try{
                        
                        try{
                            console.log(`checking for frameCount: ${frameCount} with state: %s`, this.userInBoxSubject.value)
                            if(frameCount%5==0 && this.userInBox$) {
                                const imageBitmap = await createImageBitmap(
                                    videoElement,  // Sorgente (il video)
                                    0, 0,          // sx, sy: coordinate dell'angolo in alto a sinistra
                                    this.approximateToDecine(videoElement.videoWidth),  // sw: larghezza del ritaglio (qui usi tutta la larghezza)
                                    this.approximateToDecine(videoElement.videoHeight)  // sh: altezza del ritaglio (qui usi tutta l'altezza)
                                );
                                const results = this.poseLandmarker.detectForVideo(imageBitmap, performance.now());
                                //invio ogni 5 frame      
                                this.onResults(results, videoElement, canvasElement, frameCount, uuid, is_mirrored || false);  // Gestisci i risultati
                                imageBitmap.close();  // Rilascia memoria bitmap
                            }
                            if(this.allConnectionsGreen && this.userInBoxSubject.value){
                                console.log("every connections right for frame: " + frameCount )
                                frameCount++;
                            }
                           
                        } catch(error: any){
                            console.error('Errore on processing frames:', error.message);
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


    drawSkeleton(frameNumber: number = 0, canvasElement: HTMLCanvasElement){
        const canvasCtx = canvasElement.getContext('2d');
        if(canvasCtx){
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

    approximateToDecine(value: number): number {
        return Math.round(value / 10) * 10;
    }

    //metodo per aprire pop up e chiedere all'utente se vuole che il video sia specchiato o no
    openPopUp(): Promise<boolean> {
        return new Promise((resolve) => {
            // Crea un overlay per oscurare lo schermo
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            overlay.style.zIndex = '9998';

            // Crea il popup
            const popup = document.createElement('div');
            popup.style.position = 'fixed';
            popup.style.top = '50%';
            popup.style.left = '50%';
            popup.style.transform = 'translate(-50%, -50%)';
            popup.style.backgroundColor = '#fff';
            popup.style.padding = '20px';
            popup.style.borderRadius = '8px';
            popup.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.2)';
            popup.style.zIndex = '9999';

            // Titolo
            const title = document.createElement('h3');
            title.innerText = 'Vuoi che il video sia confrontato in modalità specchiata?';
            title.style.marginBottom = '10px';

            // Checkbox
            const checkboxLabel = document.createElement('label');
            checkboxLabel.innerText = 'Specchiato';
            checkboxLabel.style.marginRight = '10px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.marginRight = '10px';

            // Bottone di conferma
            const confirmButton = document.createElement('button');
            confirmButton.innerText = 'Conferma';
            confirmButton.style.marginRight = '10px';

            // Bottone di annullamento
            const cancelButton = document.createElement('button');
            cancelButton.innerText = 'Annulla';

            // Eventi di conferma e annullamento
            confirmButton.addEventListener('click', () => {
                const isMirrored = checkbox.checked;
                document.body.removeChild(popup);
                document.body.removeChild(overlay);
                resolve(isMirrored);  // Risolvi la promessa con il valore del checkbox
            });

            cancelButton.addEventListener('click', () => {
                document.body.removeChild(popup);
                document.body.removeChild(overlay);
                resolve(false);  // Risolvi la promessa con 'false' se l'utente cancella
            });

            // Appendi gli elementi al popup
            popup.appendChild(title);
            popup.appendChild(checkboxLabel);
            popup.appendChild(checkbox);
            popup.appendChild(confirmButton);
            popup.appendChild(cancelButton);

            // Appendi il popup e l'overlay al body
            document.body.appendChild(overlay);
            document.body.appendChild(popup);
        });
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
        const canvas = canvasElement;
        if (canvas) {
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        } else {
            resolve(null);
        }
    });
    }
  
}
