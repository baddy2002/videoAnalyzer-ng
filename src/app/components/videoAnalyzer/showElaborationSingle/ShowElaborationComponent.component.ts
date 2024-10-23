import { Component, Inject, OnInit, PLATFORM_ID } from "@angular/core";
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

    constructor(
        private readonly route: ActivatedRoute,
        private readonly http: HttpClient,
        @Inject(PLATFORM_ID) private platformId: Object,
        private readonly router: Router,
    ) {}

    ngOnInit() {
        // Ottieni l'UUID dal percorso della route
        const uuid = this.route.snapshot.paramMap.get('uuid');
        const video_uuid = this.route.snapshot.paramMap.get('video_uuid');
        console.log("uuid: " + uuid)
        if (uuid && video_uuid) {
        
            this.fetchElaboration(uuid, video_uuid);

        }
    }


    onPlayerReady(source: VgApiService){
        this.api = source;
        console.log("onPlayerReady");

        this.api.getDefaultMedia().subscriptions.loadedMetadata.subscribe(
            this.autoplay.bind(this)
        );


    }

    autoplay(){
        console.log("play");
        
    }

    fetchElaboration(uuid: string, video_uuid: string) {
        // Chiamata GET per ottenere i dettagli del video
        this.http.get(`${this.apiUrl}${video_uuid}/${uuid}`).subscribe({
            next: (elaboration) => {
                this.elaboration = elaboration;
                this.elaborationUrl = this.apiUrl+`${this.elaboration.video_uuid}/${this.elaboration.uuid}`;
                //console.log(elaboration);
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
        console.log(cast.framework);
        console.log(cast.framework.CastContext.getInstance());
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

}