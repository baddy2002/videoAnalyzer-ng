import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { VideoCaptureService } from '../../../services/VideoCaptureService/VideoCaptureService.service';
import { ActivatedRoute } from '@angular/router';  


@Component({
  selector: 'app-video-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './VideoCaptureComponent.component.html',
})
export class VideoCaptureComponent implements OnInit, OnDestroy {
    @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>; // Usa ! per evitare il controllo di null  
    @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

    // Nuove proprietà per altezza, larghezza e fps
    videoWidth: number = 1920; // Imposta un valore di larghezza predefinito
    videoHeight: number = 1080;  // Imposta un valore di altezza predefinito
    videoFPS: number = 30;       // Imposta un valore di FPS predefinito

    private uuid: string = '';

    constructor(
        @Inject(PLATFORM_ID) private platformId: Object, 
        private videoCaptureService: VideoCaptureService,
        private route : ActivatedRoute,
    ) {} // Inietta il servizio
  
    ngOnInit(): void {
        if (isPlatformBrowser(this.platformId)) {
          // Estrai l'UUID dal path dell'URL
          this.route.paramMap.subscribe(params => {
            this.uuid = params.get('uuid') || '';  // Recupera l'uuid dal path
            this.startVideo();  // Avvia il video solo dopo aver ottenuto l'uuid
          });
        }
    }
  
    ngOnDestroy(): void {
      if (isPlatformBrowser(this.platformId)) {
        this.stopVideo();
      }
    }
  
    startVideo() {
            if(this.videoElement && this.canvasElement){
              this.videoElement.nativeElement.width = this.videoWidth; // Imposta larghezza video
              this.videoElement.nativeElement.height = this.videoHeight; // Imposta altezza video
            
                this.videoCaptureService.startVideo(this.videoElement.nativeElement, this.canvasElement.nativeElement, this.uuid, this.videoFPS); // Usa il servizio per avviare il video
            }
    }

    stopVideo() {
        if (isPlatformBrowser(this.platformId)) {
            if(this.canvasElement)
                this.videoCaptureService.stopVideo(this.videoElement.nativeElement, this.canvasElement.nativeElement); // Usa il servizio per fermare il video
            }
    }
  
    get lastFrame(): string | null {
        if (isPlatformBrowser(this.platformId)) {
        return this.videoCaptureService.getLastFrame(); // Ottieni l'ultimo frame dal servizio
        }
        return null;
    }
  }
