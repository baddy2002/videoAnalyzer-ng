import { ChangeDetectorRef, Component, ElementRef, Inject, OnInit, PLATFORM_ID, ViewChild } from "@angular/core";
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { VgApiService, VgCoreModule } from '@videogular/ngx-videogular/core';
import { VgControlsModule } from '@videogular/ngx-videogular/controls';
import { VgOverlayPlayModule} from '@videogular/ngx-videogular/overlay-play';
import { VgBufferingModule } from '@videogular/ngx-videogular/buffering';
import { Router } from '@angular/router';
import { PopUpComponent } from "../../common/popUpResponse/popUp.component";
import { VideoStateService } from "../../../services/VideoCaptureService/VideoStateService";
import { environment } from "../../../../config/environment";
import { KeypointsStateService } from "../../../services/VideoCaptureService/KeypointsStateService";
import { Subscription } from "rxjs";
import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { DetailFrame } from "../../../model/DetailFrame";
import { FilteredLandmark } from "../../../model/Landmark";

declare let cast: any;
declare let chrome: any;
declare global {
    interface Window {
      __onGCastApiAvailable?: (isAvailable: boolean) => void;
    }
  }


@Component({
  selector: 'app-show-video',
  standalone: true,
  imports: [CommonModule,  VgControlsModule, VgCoreModule, VgOverlayPlayModule, VgBufferingModule, PopUpComponent],
  templateUrl: './ShowElaborationComponent.component.html',
})
export class ShowElaborationComponent implements OnInit {
    @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
    @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

    apiUrl = environment.apiUrl+'confrontation/';
    elaboration: any; // Elaborazione da mostrare
    elaborationUrl: string = '';
    serverResponse: string = '';
    serverResponseDetail: string = '';
    showPopup: boolean = false;
    media: string = "video/mp4";
    preload: string = "auto";
    api: VgApiService = new VgApiService();
    isCastAvailable: boolean = false;
    private frameCount: number = 5;
    private keypointsData: Record<number, number[][]> = {};
    private userKeypointsData:  FilteredLandmark[] =[];
    private keypointsSubscription!: Subscription; // sottoscrizione al video per ottenere i dati dalla pagina precedente
    private videoSubscription!: Subscription;
    private fps: number = 0;
    private videoStream: MediaStream | null = null;
    private uuid: string | null = "";
    private video_uuid: string| null = "";
    private elaborationFrame!: DetailFrame;
    private landmark_normalized: FilteredLandmark[] = [];
    private visitedKeypoints = new Set<number>();
    detailFrame: string | null = null;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly http: HttpClient,
        @Inject(PLATFORM_ID) private platformId: Object,
        private readonly router: Router,
        private readonly keypointsStateService: KeypointsStateService,
        private readonly videoStateService: VideoStateService,
        private readonly cdr: ChangeDetectorRef,
    ) {}

    ngOnInit() {
        // Ottieni l'UUID dal percorso della route
        this.uuid = this.route.snapshot.paramMap.get('uuid');
        this.video_uuid = this.route.snapshot.paramMap.get('video_uuid');
        console.log("uuid: " + this.uuid);
        if (this.uuid && this.video_uuid) {
        
            this.fetchElaboration(this.uuid, this.video_uuid);
            
            this.keypointsSubscription = this.keypointsStateService.getKeypoints().subscribe(keypoints => {
                if (keypoints) {
                  this.keypointsData = keypoints;
                }
              });
              this.videoSubscription = this.videoStateService.getVideo().subscribe(video => {
                  if (video) {
                    this.fps = video.fps;
                  }
            });
        }
    }


    onPlayerReady(source: VgApiService){
        this.api = source;

        this.api.getDefaultMedia().subscriptions.loadedMetadata.subscribe(
            this.autoplay.bind(this)
        );


    }

    autoplay(){
        
    }

    fetchElaboration(uuid: string, video_uuid: string) {
        // Chiamata GET per ottenere i dettagli del video
        this.http.get(`${this.apiUrl}${video_uuid}/${uuid}`).subscribe({
            next: (elaboration) => {
                this.elaboration = elaboration;
                this.elaborationUrl = this.apiUrl+`${this.elaboration.video_uuid}/${this.elaboration.uuid}`;
            },
            error: (error: HttpErrorResponse) => {
                console.error('Errore nel recuperare l\'elaborazione:', error);
                this.serverResponse = error.error.message || 'Impossibile recuperare codice errore, per favore riprovare';
                this.showPopup = true;
            },
            complete: () => {
                console.log('Richiesta completata');
            }
        });

    }


    setupCast() {
        this.isCastAvailable = true;
        const castContext = cast.framework.CastContext.getInstance();
        castContext.setOptions({
        receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
        });
        // Listener per la sessione di casting
        castContext.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, (event: any) => {
            console.log("Session state changed:", event);
            if (event.sessionState === cast.framework.SessionState.SESSION_ENDED) {
                console.log("Session ended");
            }
            });
            this.isCastAvailable = true;
    }

    startCasting() {
        console.log("framework")
        console.log(chrome.cast.framework);
        //console.log(chrome.cast.framework.CastContext);
        if(chrome.cast.framework){
            const castSession = chrome.cast.framework.CastContext.getInstance().getCurrentSession();
    
            if (castSession) {
            const mediaInfo = new chrome.cast.media.MediaInfo(this.elaborationUrl, 'video/mp4');
            const request = new chrome.cast.media.LoadRequest(mediaInfo);
            
            castSession.loadMedia(request).then(
                () => console.log("Media loaded successfully for casting"),
                (errorCode: Error) => console.error("Error during casting", errorCode.message)
            );
            } else {
            console.error("No cast session available.");
            }
        } else {
            console.error("No framework available.");
        }

    }
    navigateTo(link: string) {
        this.router.navigate(['/'+link])
    }

    onClosePopup(): void {
        this.showPopup = false;
    }

    async view_details(){

        const currentTime = this.api.getDefaultMedia().currentTime;
        if (this.keypointsData && this.fps){
            this.frameCount = Math.round(Math.floor(currentTime * this.fps) /5)*5;              //calcola frame divisibile per 5
            this.frameCount = (this.frameCount > 5 ? this.frameCount : 5); 
            await this.fetchElaborationFrame();

            this.calculateConnectionLengths();
            const canvasCtx = this.canvasElement.nativeElement.getContext('2d');
            if (canvasCtx && this.videoElement.nativeElement) {
                canvasCtx.clearRect(0, 0, this.canvasElement.nativeElement.width, this.canvasElement.nativeElement.height); // Pulisce il canvas prima di disegnare
                //canvasCtx.drawImage(this.videoElement.nativeElement, 0, 0, this.canvasElement.nativeElement.width, this.canvasElement.nativeElement.height); // Disegna il frame del video sul canvas
                console.log("keyData: ",this.keypointsData[this.frameCount])
                this.drawCorrectKeypoints(this.frameCount, canvasCtx);  
                console.log("userKeyData: " ,this.userKeypointsData); 
                await this.drawIncorrectKeypoints(this.frameCount, canvasCtx);
            }
               
            
            this.detailFrame = this.getCanvasImage(this.canvasElement.nativeElement);

            if (this.videoStream) {
                this.videoStream.getTracks().forEach((track) => track.stop());
                this.videoStream = null;
              }

              
            this.videoElement.nativeElement.srcObject = null;
      
              
            // Pulisci il canvas
            canvasCtx?.clearRect(0, 0, this.canvasElement.nativeElement.width, this.canvasElement.nativeElement.height);
              

        }

    }


    private getCanvasImage(canvasElement: HTMLCanvasElement): string | null {
       
        if (canvasElement) {
            const dataURL = canvasElement.toDataURL('image/png');
           return dataURL;
        } else {
            return null;
        }
    }

    private async drawCorrectKeypoints(frameNumber: number, canvasCtx: CanvasRenderingContext2D){
       
        let canvasElement: HTMLCanvasElement = this.canvasElement.nativeElement;
        //console.log("frameNumber: ", frameNumber);
        //console.log(this.keypointsData[frameNumber])
        if (this.keypointsData[frameNumber]) {
            const keypoints = this.keypointsData[frameNumber];

            // Disegna i keypoints del server
            for (const keypoint of keypoints) {
                const index = keypoint[0]; // Indice del keypoint
                const x = keypoint[1] * canvasElement.width; // Converti in coordinate canvas
                const y = keypoint[2] * canvasElement.height; // Converti in coordinate canvas e moltiplica per costante di comparazione con altri keypoints
                const confidence = keypoint[3]; // Affidabilità

                // Disegna il keypoint se ha una certa affidabilità
                if (confidence > 0.1) {
                    canvasCtx?.beginPath();
                    canvasCtx?.arc(x, y, 3, 0, 2 * Math.PI);
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

    private async drawIncorrectKeypoints(frameNumber: number, canvasCtx: CanvasRenderingContext2D){
       
        let canvasElement: HTMLCanvasElement = this.canvasElement.nativeElement;
        //console.log(this.userKeypointsData)
        if (this.userKeypointsData) {
            const keypoints = this.userKeypointsData;

            // Disegna i keypoints del server
            for (const keypoint of keypoints) {
                const x = keypoint.x * canvasElement.width; // Converti in coordinate canvas
                const y = keypoint.y * canvasElement.height; // Converti in coordinate canvas e moltiplica per costante di comparazione con altri keypoints
                const confidence = keypoint.visibility; // Affidabilità

                // Disegna il keypoint se ha una certa affidabilità
                if (confidence > 0.1) {
                    canvasCtx?.beginPath();
                    canvasCtx?.arc(x, y, 3, 0, 2 * Math.PI);
                    canvasCtx.fillStyle = 'purple'; // Colore per keypoints del server
                    canvasCtx?.fill();
                }
            }

            // Connessioni manuali per i keypoints del server
            const connections = PoseLandmarker.POSE_CONNECTIONS; // Usa le stesse connessioni
            for (const connection of connections) {
                const startKeypoint = keypoints.find(kp => kp.index === connection.start);
                const endKeypoint = keypoints.find(kp => kp.index === connection.end);

                if (startKeypoint && endKeypoint) {
                    const startX = startKeypoint.x * canvasElement.width;
                    const startY = startKeypoint.y * canvasElement.height;
                    const endX = endKeypoint.x * canvasElement.width;
                    const endY = endKeypoint.y * canvasElement.height;
                    
                    //recupera il colore della connessione
                    const conn = this.elaborationFrame.connections.find(conn => conn.connection[0] === connection.start && conn.connection[1] === connection.end);
                    let color = "red"
                    if(conn)
                        color = conn.color 
                    

                    // Disegna la linea di connessione
                    canvasCtx?.beginPath();
                    canvasCtx?.moveTo(startX, startY);
                    canvasCtx?.lineTo(endX, endY);
                    canvasCtx.strokeStyle = color; // Colore per connessioni del server
                    canvasCtx.lineWidth = 5;
                    canvasCtx?.stroke();
                }
            }
        }
        
    }

    async fetchElaborationFrame(): Promise<void> {
        try {
            let response = await this.http.get<DetailFrame>(`${this.apiUrl}a/${this.video_uuid}/${this.uuid}/${this.frameCount}`).toPromise();
            if(response){
                this.elaborationFrame = response;
                console.log(this.elaborationFrame);
            }
            else 
                console.error("Response from server is undefined: " + response)
        } catch (error) {
            console.error('Errore durante il recupero dei keypoints:', error);
        }
    }

    calculateConnectionLengths() {
        
        const connections = this.elaborationFrame.connections;
    
        // Calcolare le lunghezze delle connessioni
        const lengths = connections.map(connection => {
          // Verifica che gli indici siano validi
            const start = connection.connection[0];
            const end = connection.connection[1];
            const videoModelStart = this.elaborationFrame.correct_keypoints.find(correct => correct[0] === start);
            const videoModelEnd = this.elaborationFrame.correct_keypoints.find(correct => correct[0] === end);

            if (videoModelStart && videoModelEnd) {
                const videoStart = this.elaborationFrame.keypoints[start];
                const videoEnd = this.elaborationFrame.keypoints[end];
        
                // Calcolare la lunghezza usando la formula della distanza euclidea
    
                const videoLength = Math.sqrt(
                  Math.pow(videoEnd.x - videoStart.x, 2) +
                  Math.pow(videoEnd.y - videoStart.y, 2)
                );
                const videoModelLength = Math.sqrt(
                    Math.pow(videoModelEnd[1] - videoModelStart[1], 2) +
                    Math.pow(videoModelEnd[2] - videoModelStart[2], 2)
                  );
    
                return {"connection": [start, end], "lenght": videoLength, "coefficient": (videoModelLength/videoLength)};

            }

            return null;
        }).filter(length => length !== null)
        
        this.normalizeKeypoints(lengths);

    }

    calculateNewPosition(start: FilteredLandmark, end: FilteredLandmark, coefficient: number) {

    
        // Calcola il vettore direzionale
        let directionX = end.x - start.x;
        let directionY = end.y - start.y;
        let distance = Math.sqrt(directionX ** 2 + directionY ** 2);
    
        // Calcola nuove coordinate con il coefficiente
        let newEndX = start.x + (directionX / distance) * distance * coefficient;
        let newEndY = start.y + (directionY / distance) * distance * coefficient;
        return [end.index, newEndX, newEndY];
    }

    adjustKeypointPosition(currentPoint: FilteredLandmark, lengths:{
        connection: number[];
        lenght: number;
        coefficient: number;
    }[] ) {
        
        this.visitedKeypoints.add(currentPoint.index);
        this.landmark_normalized.push(currentPoint);
        let connections = this.elaborationFrame.connections;
        connections.forEach(connection => {
            let [startId, endId] = connection.connection;
            let isStartCurrent = startId === currentPoint.index;
            let isEndCurrent = endId === currentPoint.index;
            console.log("currentpoint: " , currentPoint.index);
            // Se la connessione coinvolge il punto corrente
            if (isStartCurrent || isEndCurrent) {
                let nextPointId = isStartCurrent ? endId : startId;
                if (!this.visitedKeypoints.has(nextPointId)) {
                    // Trova il prossimo keypoint non visitato
                    let nextPoint = this.elaborationFrame.keypoints.find(
                        kp => kp.index === nextPointId
                    );
                    let length = lengths.find(lenght => 
                        (lenght.connection[0] == (isStartCurrent ? startId : endId) && lenght.connection[1] == nextPointId) ||
                        (lenght.connection[1] == (isStartCurrent ? startId : endId) && lenght.connection[0] == nextPointId));
                    console.log("nextPoint: " , nextPointId)
                    if(nextPoint && length){
                        
                        // Calcola la nuova posizione del prossimo punto
                        let newPosition = this.calculateNewPosition(currentPoint, nextPoint, length.coefficient);
                        nextPoint.x = newPosition[1];
                        nextPoint.y = newPosition[2];
                        console.log("calculate new position: " + newPosition);
                        // Ricorsione per i keypoints collegati
                        this.adjustKeypointPosition(nextPoint, lengths);
                    }

                }
            }
        });
    }

    normalizeKeypoints(lengths: {
        connection: number[];
        lenght: number;
        coefficient: number;
    }[]){
        const connections = this.elaborationFrame.connections;
        this.landmark_normalized=[];
        this.visitedKeypoints = new Set<number>()
        let startingPoint = null;
        for( let i = 0; i  <= connections.length; i++){
            startingPoint = this.elaborationFrame.keypoints.find(keypoint => keypoint.index === connections[i].connection[0]);
            
            if(startingPoint)
                break;
        }
        if(startingPoint){
            console.log("starting point: ", startingPoint);
        this.adjustKeypointPosition(startingPoint, lengths);

        // Salva le modifiche per il frame corrente
        this.userKeypointsData = this.landmark_normalized;
        }
        
    }


    adjustCanvasDimensions() {
        setTimeout(() => {
            const overlayDiv = document.querySelector('.vg-overlay-play');
            
            if (!overlayDiv) {
              console.error('overlayDiv is undefined');
              return;
            }
        
            const width = overlayDiv.clientWidth;
            const height = overlayDiv.clientHeight;
        
            this.canvasElement.nativeElement.width = width;
            this.canvasElement.nativeElement.height = height;
            
            
            const canvasCtx = this.canvasElement.nativeElement.getContext('2d');
            if (canvasCtx) {
                canvasCtx.clearRect(0, 0, width, height);
                canvasCtx.drawImage(this.canvasElement.nativeElement, 0, 0, width, height);
            }
            
            console.log(this.canvasElement.nativeElement.width, this.canvasElement.nativeElement.height);
        }, 100); // Timeout di 100 ms
    }



}
