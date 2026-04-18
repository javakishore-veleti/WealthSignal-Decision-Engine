import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { CommonModule, DecimalPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";

import { ProductCatalogService } from "../../core/services/product-catalog.service";
import { Product, ProductListResponse } from "../../core/models/product.model";

@Component({
  selector: "ws-product-list",
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end gap-4 mb-6">
      <div class="flex-1">
        <nav class="text-sm text-ink-500 mb-1 flex items-center gap-2">
          <span>Domain Services</span>
          <span class="text-ink-300">/</span>
          <span class="text-brand-700 font-semibold">Product Catalog</span>
        </nav>
        <h1 class="ws-h1">Wealth-management products</h1>
        <p class="ws-subtle mt-1">
          {{ total() | number }} products across {{ pages() }} page{{ pages() === 1 ? '' : 's' }}
        </p>
      </div>
      <div class="flex gap-3">
        <a routerLink="/domain-services/product-catalog/search" class="ws-btn-ghost">
          Search
        </a>
        <a routerLink="/domain-services/product-catalog/create" class="ws-btn-primary">
          + New product
        </a>
      </div>
    </div>

    <section class="ws-card p-0 overflow-hidden">
      @if (loading()) {
        <div class="py-24 text-center text-ink-500">Loading catalogue…</div>
      } @else if (errorMsg()) {
        <div class="p-10 text-center">
          <div class="inline-flex h-14 w-14 rounded-2xl bg-rose-500/10 items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6 text-rose-600">
              <path d="M12 9v4m0 4h.01M4.93 19h14.14a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.2 16a2 2 0 001.73 3z"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="font-semibold text-ink-900 mb-1">Couldn't reach product_catalog_api</div>
          <div class="text-sm text-ink-500 max-w-md mx-auto">{{ errorMsg() }}</div>
          <div class="text-xs text-ink-500 mt-3">
            Start the service with
            <code class="font-mono text-brand-700">npm run run:local:middleware:product-catalog</code>,
            then reload this page.
          </div>
        </div>
      } @else {
        <!-- Table header -->
        <div class="grid grid-cols-12 gap-3 px-5 py-3 border-b border-surface-200
                    text-xs uppercase tracking-[0.14em] font-bold text-ink-500 bg-surface-50">
          <div class="col-span-5">Product</div>
          <div class="col-span-2">Asset class</div>
          <div class="col-span-1 text-center">SRRI</div>
          <div class="col-span-2">Target segment</div>
          <div class="col-span-2 text-right">Min investment</div>
        </div>

        @for (p of products(); track p.id) {
          <div class="grid grid-cols-12 gap-3 px-5 py-4 border-b border-surface-100
                      hover:bg-brand-50/50 transition-colors duration-200 items-center">
            <div class="col-span-5 flex items-center gap-3 min-w-0">
              <div class="h-10 w-10 rounded-xl flex items-center justify-center text-white
                          text-xs font-bold shadow-soft shrink-0"
                   [style.background]="gradientFor(p.asset_class)">
                {{ abbrev(p.asset_class) }}
              </div>
              <div class="min-w-0">
                <div class="font-semibold text-ink-900 truncate">{{ p.name }}</div>
                <div class="text-xs text-ink-500 font-mono truncate">
                  {{ p.sku }} · {{ p.issuer }}
                </div>
              </div>
            </div>
            <div class="col-span-2 text-sm text-ink-700 truncate">{{ p.asset_class }}</div>
            <div class="col-span-1 text-center">
              <span class="ws-pill" [class]="srriClass(p.risk_level)">
                {{ p.risk_level }}/7
              </span>
            </div>
            <div class="col-span-2 text-sm text-ink-700 truncate">{{ p.target_segment }}</div>
            <div class="col-span-2 text-right font-mono text-sm text-ink-900">
              {{ p.currency }} {{ formatNumber(p.min_investment) }}
            </div>
          </div>
        }

        @if (products().length === 0) {
          <div class="py-16 text-center text-ink-500">
            Catalog is empty. Run the
            <a routerLink="/domain-services/product-catalog/initial-load"
               class="text-brand-700 font-semibold hover:underline">Initial Data Load</a>
            to populate it.
          </div>
        }

        <!-- Pagination -->
        <div class="flex items-center justify-between px-5 py-4 bg-surface-50 border-t border-surface-200">
          <div class="text-sm text-ink-500">
            Page <span class="text-ink-900 font-semibold">{{ page() }}</span> of {{ pages() }}
          </div>
          <div class="flex gap-2">
            <button class="ws-btn-ghost" (click)="prev()" [disabled]="page() <= 1">&larr; Prev</button>
            <button class="ws-btn-ghost" (click)="next()" [disabled]="page() >= pages()">Next &rarr;</button>
          </div>
        </div>
      }
    </section>
  `,
})
export class ProductListComponent {
  private readonly catalog = inject(ProductCatalogService);

  readonly products = signal<Product[]>([]);
  readonly total = signal<number>(0);
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(20);
  readonly loading = signal<boolean>(true);
  readonly errorMsg = signal<string | null>(null);

  readonly pages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  constructor() {
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    this.catalog.list({ page: this.page(), pageSize: this.pageSize() }).subscribe({
      next: (res: ProductListResponse) => {
        this.products.set(res.items);
        this.total.set(res.pagination.total_items);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg.set(err.message || "Network error");
        this.loading.set(false);
      },
    });
  }

  prev(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.fetch();
    }
  }

  next(): void {
    if (this.page() < this.pages()) {
      this.page.update((p) => p + 1);
      this.fetch();
    }
  }

  formatNumber(value: string): string {
    return new Intl.NumberFormat().format(Number(value));
  }

  abbrev(assetClass: string): string {
    const map: Record<string, string> = {
      "Equity": "EQ",
      "Fixed Income": "FI",
      "Multi-Asset": "MA",
      "Alternative": "AL",
      "Cash": "CS",
      "Commodity": "CO",
      "Real Estate": "RE",
    };
    return map[assetClass] || "—";
  }

  gradientFor(assetClass: string): string {
    const map: Record<string, string> = {
      "Equity":       "linear-gradient(135deg, #4F46E5, #7C3AED)",
      "Fixed Income": "linear-gradient(135deg, #06B6D4, #0EA5E9)",
      "Multi-Asset":  "linear-gradient(135deg, #10B981, #06B6D4)",
      "Alternative":  "linear-gradient(135deg, #F59E0B, #F97316)",
      "Cash":         "linear-gradient(135deg, #64748B, #334155)",
      "Commodity":    "linear-gradient(135deg, #EAB308, #F59E0B)",
      "Real Estate":  "linear-gradient(135deg, #EC4899, #8B5CF6)",
    };
    return map[assetClass] || "linear-gradient(135deg, #4F46E5, #06B6D4)";
  }

  srriClass(level: number): string {
    if (level <= 2) return "ws-pill-success";
    if (level <= 4) return "ws-pill-info";
    if (level <= 5) return "ws-pill-warn";
    return "ws-pill-danger";
  }
}
