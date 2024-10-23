import { Component } from "@angular/core";
import { Router } from '@angular/router';
import { HeaderComponent } from "../../common/header/header.component";
import { FooterComponent } from "../../common/footer/footer.component";

@Component({
  selector: 'app-video-analyzer',
  standalone: true,
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './AboutComponent.component.html',
})
export class AboutComponent {
    constructor(private readonly router: Router) { }

    navigateTo(link: string) {
        this.router.navigate(['/'+link])
    }
}
