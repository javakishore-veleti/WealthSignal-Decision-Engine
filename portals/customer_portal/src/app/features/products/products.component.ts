import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { CommonModule, DecimalPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";

import { ProductCatalogService } from "../../core/services/product-catalog.service";
import { Product, ProductListResponse } from "../../core/models/product.model";

@Component({
  selector: "ws-products",
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-[1400px] mx-auto px-6 py-10">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div class="inline-block ws-pill ws-pill-sky mb-2">Explore the catalogue</div>
          <h1 class="ws-h1">{{ total() | number }} wealth products</h1>
          <p class="ws-subtle mt-1">Sorted by AUM. Refine with the filters on the left.</p>
        </div>
        <a routerLink="/" class="ws-btn-ghost">
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
            <path fill-rule="evenodd" clip-rule="evenodd"
              d="M9.7 15.7a1 1 0 01-1.4 0l-5-5a1 1 0 010-1.4l5-5a1 1 0 011.4 1.4L6.4 9H16a1 1 0 110 2H6.4l3.3 3.3a1 1 0 010 1.4z"/>
          </svg>
          Back to home
        </a>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <!-- Filter rail -->
        <aside class="ws-card p-5 h-fit sticky top-24">
          <div class="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <span class="h-8 w-8 rounded-lg bg-horizon flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 text-white">
                <path d="M3 5a1 1 0 011-1h12a1 1 0 01.8 1.6L12 11v5a1 1 0 01-1.4.9l-2-1a1 1 0 01-.6-.9v-4L3.2 5.6A1 1 0 013 5z"/>
              </svg>
            </span>
            Refine
          </div>

          <div class="flex flex-col gap-4 text-sm">
            <label class="flex flex-col gap-1.5">
              <span class="font-semibold text-ink-700">Asset class</span>
              <select class="ws-field" [(ngModel)]="assetClass" (change)="fetch()">
                <option [ngValue]="null">Any</option>
                <option>Equity</option>
                <option>Fixed Income</option>
                <option>Multi-Asset</option>
                <option>Alternative</option>
                <option>Cash</option>
                <option>Commodity</option>
                <option>Real Estate</option>
              </select>
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="font-semibold text-ink-700">Risk tolerance</span>
              <div class="flex items-center gap-2">
                <input type="number" min="1" max="7" class="ws-field" placeholder="Min"
                       [(ngModel)]="riskMin"/>
                <span class="text-ink-400">—</span>
                <input type="number" min="1" max="7" class="ws-field" placeholder="Max"
                       [(ngModel)]="riskMax"/>
              </div>
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="font-semibold text-ink-700">Target segment</span>
              <select class="ws-field" [(ngModel)]="segment">
                <option [ngValue]="null">Any</option>
                <option>Young-Investor</option>
                <option>Mid-Tier-Saver</option>
                <option>Retirement-Planner</option>
                <option>High-Wealth-Prospect</option>
                <option>Passive-Holder</option>
              </select>
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="font-semibold text-ink-700">Max min-investment</span>
              <input type="number" class="ws-field" placeholder="e.g. 10000"
                     [(ngModel)]="minInvestMax"/>
            </label>

            <div class="flex gap-2 pt-2">
              <button class="ws-btn-primary flex-1" (click)="applyFilters()">Apply</button>
              <button class="ws-btn-ghost" (click)="resetFilters()">Reset</button>
            </div>
          </div>
        </aside>

        <!-- Product grid -->
        <div>
          @if (loading()) {
            <div class="py-24 text-center text-ink-500">Loading catalogue…</div>
          } @else if (errorMsg()) {
            <div class="ws-card p-8 text-center">
              <div class="font-semibold text-coral-500 mb-1">Couldn't reach the catalogue</div>
              <div class="text-sm text-ink-500">{{ errorMsg() }}</div>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              @for (p of products(); track p.id) {
                <div class="ws-product-card" (click)="apply(p.sku)">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="h-11 w-11 rounded-xl flex items-center justify-center text-white
                                text-xs font-bold shadow-soft"
                         [style.background]="gradientFor(p.asset_class)">
                      {{ abbrev(p.asset_class) }}
                    </div>
                    <span class="ws-pill" [class]="srriClass(p.risk_level)">
                      SRRI {{ p.risk_level }}/7
                    </span>
                    <span class="ml-auto text-xs text-ink-500 font-mono">{{ p.product_type }}</span>
                  </div>

                  <div class="font-semibold text-ink-900 leading-snug mb-1 line-clamp-2">
                    {{ p.name }}
                  </div>
                  <div class="text-xs text-ink-500 mb-3">
                    {{ p.issuer }} · {{ p.geography }}
                  </div>
                  <div class="text-sm text-ink-500 line-clamp-2 mb-4">
                    {{ p.short_description }}
                  </div>

                  <div class="flex items-center justify-between pt-3 border-t border-surface-100">
                    <div>
                      <div class="text-[11px] uppercase tracking-wide text-ink-500 font-semibold">Min invest</div>
                      <div class="font-display font-bold text-sky-700">
                        {{ p.currency }} {{ formatNumber(p.min_investment) }}
                      </div>
                    </div>
                    <span class="text-sky-700 font-semibold text-sm">
                      Start application →
                    </span>
                  </div>
                </div>
              }
            </div>

            @if (products().length === 0) {
              <div class="py-16 text-center text-ink-500">
                No products match your filters.
              </div>
            }

            <div class="flex items-center justify-between mt-8">
              <div class="text-sm text-ink-500">
                Page <span class="text-ink-900 font-semibold">{{ page() }}</span> of {{ pages() }}
              </div>
              <div class="flex gap-2">
                <button class="ws-btn-ghost" (click)="prev()" [disabled]="page() <= 1">&larr; Prev</button>
                <button class="ws-btn-ghost" (click)="next()" [disabled]="page() >= pages()">Next &rarr;</button>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class ProductsComponent {
  private readonly catalog = inject(ProductCatalogService);
  private readonly router = inject(Router);

  readonly products = signal<Product[]>([]);
  readonly total = signal<number>(0);
  readonly page = signal<number>(1);
  readonly pageSize = 24;

  readonly assetClass = signal<string | null>(null);
  readonly riskMin = signal<number | null>(null);
  readonly riskMax = signal<number | null>(null);
  readonly segment = signal<string | null>(null);
  readonly minInvestMax = signal<number | null>(null);

  readonly loading = signal<boolean>(true);
  readonly errorMsg = signal<string | null>(null);

  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  constructor() {
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    const hasFilter =
      !!this.assetClass() || !!this.segment() || this.riskMin() !== null ||
      this.riskMax() !== null || this.minInvestMax() !== null;

    const handler = {
      next: (res: ProductListResponse) => {
        this.products.set(res.items);
        this.total.set(res.pagination.total_items);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg.set(err.message || "Network error");
        this.loading.set(false);
      },
    };

    if (hasFilter) {
      this.catalog.searchCriteria({
        asset_class: (this.assetClass() as Product["asset_class"]) ?? undefined,
        target_segment: (this.segment() as Product["target_segment"]) ?? undefined,
        risk_level_min: this.riskMin() ?? undefined,
        risk_level_max: this.riskMax() ?? undefined,
        min_investment_max: this.minInvestMax() != null ? String(this.minInvestMax()) : undefined,
        is_active: true,
      }, this.page()).subscribe(handler);
    } else {
      this.catalog.list(this.page(), this.pageSize).subscribe(handler);
    }
  }

  applyFilters(): void {
    this.page.set(1);
    this.fetch();
  }

  resetFilters(): void {
    this.assetClass.set(null);
    this.riskMin.set(null);
    this.riskMax.set(null);
    this.segment.set(null);
    this.minInvestMax.set(null);
    this.applyFilters();
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

  apply(sku: string): void {
    this.router.navigate(["/apply", sku]);
  }

  formatNumber(v: string): string {
    return new Intl.NumberFormat().format(Number(v));
  }

  abbrev(a: string): string {
    const m: Record<string, string> = {
      "Equity": "EQ", "Fixed Income": "FI", "Multi-Asset": "MA",
      "Alternative": "AL", "Cash": "CS", "Commodity": "CO", "Real Estate": "RE",
    };
    return m[a] || "—";
  }

  gradientFor(a: string): string {
    const m: Record<string, string> = {
      "Equity":       "linear-gradient(135deg, #0EA5E9, #8B5CF6)",
      "Fixed Income": "linear-gradient(135deg, #06B6D4, #0EA5E9)",
      "Multi-Asset":  "linear-gradient(135deg, #10B981, #06B6D4)",
      "Alternative":  "linear-gradient(135deg, #F59E0B, #F43F5E)",
      "Cash":         "linear-gradient(135deg, #64748B, #334155)",
      "Commodity":    "linear-gradient(135deg, #EAB308, #F59E0B)",
      "Real Estate":  "linear-gradient(135deg, #F43F5E, #8B5CF6)",
    };
    return m[a] || "linear-gradient(135deg, #0EA5E9, #10B981)";
  }

  srriClass(level: number): string {
    if (level <= 2) return "ws-pill-emerald";
    if (level <= 4) return "ws-pill-sky";
    if (level <= 5) return "ws-pill-gold";
    return "ws-pill-coral";
  }
}
