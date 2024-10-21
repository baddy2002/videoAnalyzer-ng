import { Component, OnInit } from "@angular/core";
import { Router } from '@angular/router';
import { HeaderComponent } from "../../common/header/header.component";
import { FooterComponent } from "../../common/footer/footer.component";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { ListComponent } from "../../common/list/ListComponent.component";
import { environment } from "../../../../config/environment";

@Component({
  selector: 'app-video-analyzer',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, ListComponent],
  templateUrl: './ShowVideoListComponent.component.html',
})
export class ShowVideoListComponent implements OnInit{
    
    private readonly apiUrl = environment.apiUrl+'analyze/';
    videoList: any[] = [];
    itemsPerPage=5;
    totalItems: number = 0;
    serverResponse: string = '';
    showPopup: boolean = false;
    displayFields = ['name', 'size'];
    
    constructor(private readonly router: Router, private readonly http: HttpClient) { }
    ngOnInit() {
      console.log("caricando il componente e fetchando");
      this.http.get(`${this.apiUrl}?startRow=${0}&pageSize=${this.itemsPerPage}`, { 
        observe: 'response', // Osserva la risposta completa
        transferCache: {
          includeHeaders: ['listsize']  // Includi l'header listSize
      }
      }).subscribe({
        next: (response: any) => {
          console.log(response);
          this.videoList = response.body.map((item: any) => {
            return {
              ...item,
              size: (item.size / (1024 * 1024)).toFixed(2)+"MB" // Converti da byte a MB e limita a 2 decimali
            };
          });
          this.totalItems = Number(response.headers.get('listsize')); // Assicurati che il tuo backend restituisca il totale
        },
        error: (error: HttpErrorResponse) => {
          console.error('Errore nel recuperare i video:', error)
          this.serverResponse = error.error.message || 'Impossibile recuperare codice errore, per favore riprovare';
          this.showPopup = true;
        },
        complete: () => {
          console.log('Richiesta completata '+ this.totalItems);
        }
      })
      console.log(this.videoList);
    }

    fetchVideos(startRow: number, pageSize: number) {
      this.http.get(`${this.apiUrl}?startRow=${startRow}&pageSize=${pageSize}`, { 
        observe: 'response', // Osserva la risposta completa
        transferCache: {
          includeHeaders: ['listsize']  // Includi l'header listSize
      } // Osserva la risposta completa
      }).subscribe({
        next: (response: any) => {
          console.log(response);
          this.videoList = response.body.map((item: any) => {
            return {
              ...item,
              size: (item.size / (1024 * 1024)).toFixed(2)+"MB" // Converti da byte a MB e limita a 2 decimali
            };
          });
          this.totalItems = Number(response.headers.get('listsize'));; // Assicurati che il tuo backend restituisca il totale
        },
        error: (error: HttpErrorResponse) => {
          console.error('Errore nel recuperare i video:', error)
          this.serverResponse = error.error.message || 'Impossibile recuperare codice errore, per favore riprovare';
          this.showPopup = true;
        },
        complete: () => {
          console.log('Richiesta completata ' + this.totalItems);
        }
      })
    }

    onPageChange(event: { start: number; end: number }) {
      const startRow = event.start;
      this.fetchVideos(startRow, this.itemsPerPage);
    }

    navigateTo(link: string) {
        this.router.navigate(['/'+link])
    }
}
