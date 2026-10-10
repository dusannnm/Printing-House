import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderClient } from '../headers/header-client';
import { AppFooter } from '../headers/app-footer';
import { ProductService } from '../../services/product-service';
import { AuthService } from '../../services/auth-service';
import { Product } from '../../models/product';
import { UPLOADS_URL } from '../../constants/validation';

// Prosireni detalji proizvoda za prijavljenog klijenta: opis, cena, boje i vrste stampe
@Component({
  selector: 'app-client-product',
  imports: [FormsModule, HeaderClient, AppFooter],
  templateUrl: './client-product.html'
})
export class ClientProduct implements OnInit {

  // Proizvod bez sopstvenih boja nudi se u beloj
  static readonly DEFAULT_COLOR = 'White';

  product: Product | null = null;
  selectedColor = ClientProduct.DEFAULT_COLOR;
  message = '';
  uploadsUrl = UPLOADS_URL;

  // Sluzi da se sopstveni komentari uokvire narandzasto
  username = '';

  private auth = inject(AuthService);
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    this.username = this.auth.username;
    const code = this.route.snapshot.paramMap.get('code') ?? '';

    this.productService.getExtended(code).subscribe({
      next: (product) => {
        this.product = product;
        this.selectedColor = this.colorOptions[0];
      },
      error: (err) => this.message = err.error?.message ?? 'Product could not be loaded.'
    });
  }

  // Padajuca lista uvek nudi nesto, i za proizvod bez boja
  get colorOptions(): string[] {
    const colors = this.product?.colors ?? [];
    return colors.length > 0 ? colors : [ClientProduct.DEFAULT_COLOR];
  }

  // Izabrana boja putuje kroz adresu, da se ne izgubi pri osvezavanju stranice
  next() {
    this.router.navigate(['client', 'prepare', this.product?.code], {
      queryParams: { color: this.selectedColor }
    });
  }

  back() {
    this.router.navigate(['client', 'search']);
  }
}
