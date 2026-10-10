import { Component } from '@angular/core';

// Isti footer ispod svake stranice
@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './app-footer.html'
})
export class AppFooter {
  year = new Date().getFullYear();
}
