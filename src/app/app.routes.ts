import { CanActivate, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { VideoAnalyzerHomeComponent } from './components/videoAnalyzer/home/videoAnalyzerHome.component';
import { VideoAnalyzerComponent } from './components/videoAnalyzer/analyzeFormRequest/analyzeFormRequest.component';
import { Injectable } from '@angular/core';
import { AboutComponent } from './components/videoAnalyzer/about/AboutComponent.component';
import { HelpComponent } from './components/videoAnalyzer/help/HelpComponent.component';
import { ShowVideoListComponent } from './components/videoAnalyzer/showVideosList/ShowVideoListComponent.component';
import { ShowVideoComponent } from './components/videoAnalyzer/showVideoSingle/ShowVideoComponent.component';
import { VideoCaptureComponent } from './components/videoAnalyzer/VideoCaptureComponent/VideoCaptureComponent.component';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  canActivate(): boolean {
    // Add authentication logic here
    return true;
  }
}

export const routes: Routes = [
    {path: '', component: VideoAnalyzerHomeComponent},
    {path: 'about', component: AboutComponent},
    {path: 'help', component: HelpComponent},
    {path: 'videos', component: ShowVideoListComponent},
    {path: 'videos/:uuid', component: ShowVideoComponent},
    {path: 'videos/:uuid/confront', component: VideoCaptureComponent},
    {path: 'analyze', component: VideoAnalyzerComponent, canActivate: [AuthGuard]},
];
