import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VideoStateService {
  private readonly videoSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  setVideo(video: any): void {
    this.videoSubject.next(video);
  }

  getVideo(): Observable<any> {
    return this.videoSubject.asObservable();
  }

}
