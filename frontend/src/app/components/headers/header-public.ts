import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Meni za posetioce koji nisu prijavljeni
@Component({
  selector: 'app-header-public',
  imports: [RouterLink],
  templateUrl: './header-public.html'
})
export class HeaderPublic {
}
