import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KeypointsStateService {
  private readonly keypointsSubject: BehaviorSubject<any>;

  constructor() {
    const savedVideo = localStorage.getItem('keypoints');
    this.keypointsSubject = new BehaviorSubject<any>(savedVideo ? JSON.parse(savedVideo) : null);
  }

  setKeypoints(keypoints: any): void {
    this.keypointsSubject.next(keypoints);
    localStorage.setItem('keypoints', JSON.stringify(keypoints));
  }

  getKeypoints(): Observable<any> {
    return this.keypointsSubject.asObservable();
  }

}
