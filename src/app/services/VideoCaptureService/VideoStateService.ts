import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VideoStateService {
  private readonly videoSubject: BehaviorSubject<any>;

  constructor() {
    const savedVideo = localStorage.getItem('video');
    this.videoSubject = new BehaviorSubject<any>(savedVideo ? JSON.parse(savedVideo) : null);
  }

  setVideo(video: any): void {
    this.videoSubject.next(video);
    localStorage.setItem('video', JSON.stringify(video));
  }

  getVideo(): Observable<any> {
    return this.videoSubject.asObservable();

  }

}
