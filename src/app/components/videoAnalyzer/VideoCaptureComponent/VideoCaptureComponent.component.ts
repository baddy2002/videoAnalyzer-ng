import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { VideoCaptureService } from '../../../services/VideoCaptureService/VideoCaptureService.service';

@Component({
  selector: 'app-video-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './VideoCaptureComponent.component.html',
})
export class VideoCaptureComponent implements OnInit, OnDestroy {
    @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>; // Usa ! per evitare il controllo di null  
    @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
    constructor(@Inject(PLATFORM_ID) private platformId: Object, private videoCaptureService: VideoCaptureService) {} // Inietta il servizio
  
    ngOnInit(): void {
      if (isPlatformBrowser(this.platformId)) {
        this.startVideo();
      }
    }
  
    ngOnDestroy(): void {
      if (isPlatformBrowser(this.platformId)) {
        this.stopVideo();
      }
    }
  
    startVideo() {

            if(this.videoElement && this.canvasElement)
                this.videoCaptureService.startVideo(this.videoElement.nativeElement, this.canvasElement.nativeElement); // Usa il servizio per avviare il video
        
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
