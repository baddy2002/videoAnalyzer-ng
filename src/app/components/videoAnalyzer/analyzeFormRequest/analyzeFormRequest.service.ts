import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root', 
})
export class VideoAnalyzerService {
  private apiUrl = 'http://localhost:8000/analyze/';

  http = inject(HttpClient)

  analyzeVideo(file: File, area: any, portions: any, description: string): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('file1', file);
    formData.append('area', JSON.stringify(area));
    formData.append('portions', JSON.stringify(portions));
    formData.append('description', description);
    return this.http.post<any>(this.apiUrl, formData);
  }
}
