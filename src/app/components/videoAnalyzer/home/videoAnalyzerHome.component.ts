import { Component } from "@angular/core";
import { HeaderComponent } from "../../common/header/header.component";
import { FooterComponent } from "../../common/footer/footer.component";
import { Router } from '@angular/router';

@Component({
  selector: 'app-video-analyzer',
  standalone: true,
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './videoAnalyzerHome.component.html',
})
export class VideoAnalyzerHomeComponent {
    constructor(private router: Router) { }

    navigateTo(link: string) {
        this.router.navigate(['/'+link])
    }
}
