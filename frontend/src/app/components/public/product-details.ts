import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderPublic } from '../headers/header-public';
import { AppFooter } from '../headers/app-footer';
import { ProductService } from '../../services/product-service';
import { Product } from '../../models/product';
import { UPLOADS_URL } from '../../constants/validation';

// Javni detalji proizvoda
// Sifra je parametar rute (/product/CS-001), pa stranica moze da se osvezi i adresa podeli
@Component({
  selector: 'app-product-details',
  imports: [HeaderPublic, AppFooter],
  templateUrl: './product-details.html'
})
export class ProductDetails implements OnInit {

  product: Product | null = null;
  message = '';
  uploadsUrl = UPLOADS_URL;

  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    // Cita se jednom pri otvaranju - jedini izlaz sa stranice je Back, pa se parametar ne menja dok komponenta zivi
    const code = this.route.snapshot.paramMap.get('code') ?? '';

    this.productService.getByCode(code).subscribe({
      next: (product) => this.product = product,
      error: (err) => this.message = err.error?.message ?? 'Product could not be loaded.'
    });
  }

  back() {
    this.router.navigate(['']);
  }
}
