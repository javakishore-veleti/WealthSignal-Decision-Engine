import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";

import { ProductCatalogService } from "../../core/services/product-catalog.service";

interface KpiTile {
  label: string;
  value: string;
  change: string;
  gradient: string;
  iconPath: string;
}

@Component({
  selector: "ws-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Hero -->
    <section class="ws-card-gradient p-8 md:p-10 mb-8 relative overflow-hidden">
      <div class="absolute -right-32 -top-32 h-[360px] w-[360px] rounded-full bg-white/10 blur-3xl"></div>
      <div class="absolute -left-20 -bottom-20 h-[260px] w-[260px] rounded-full bg-gold-500/30 blur-3xl"></div>

      <div class="relative z-10 max-w-3xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur
                    text-xs font-semibold tracking-wide mb-4">
          <span class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
          All systems nominal
        </div>
        <h1 class="ws-h1 text-white mb-3">
          Welcome back, Kishore.
        </h1>
        <p class="text-white/80 text-lg leading-relaxed max-w-2xl">
          Your WealthSignal decision engine is humming. Tail-risk alerts are quiet,
          the product catalogue is current, and the partial-form scoring pipeline
          has served {{ scoredToday() }} decisions today.
        </p>

        <div class="flex flex-wrap gap-3 mt-6">
          <a routerLink="/domain-services/product-catalog/initial-load" class="ws-btn-accent">
            <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
              <path d="M10 3a1 1 0 01.894.553L16 13h-2.172L10 5.618 6.172 13H4L9.106 3.553A1 1 0 0110 3z"/>
              <path d="M3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
            </svg>
            Run Initial Data Load
          </a>
          <a routerLink="/domain-services/product-catalog"
             class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold
                    text-white bg-white/10 hover:bg-white/20 transition-colors duration-200">
            Open Product Catalog &rarr;
          </a>
        </div>
      </div>
    </section>

    <!-- KPI grid -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      @for (tile of kpis(); track tile.label) {
        <div class="ws-stat">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs uppercase tracking-[0.18em] font-bold text-ink-500">
              {{ tile.label }}
            </span>
            <div class="h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-soft"
                 [style.background]="tile.gradient">
              <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4">
                <path [attr.d]="tile.iconPath" stroke="currentColor" stroke-width="2.2"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          <div class="font-display text-3xl font-bold text-ink-900 tracking-tight">
            {{ tile.value }}
          </div>
          <div class="text-xs text-emerald-600 font-semibold">{{ tile.change }}</div>
        </div>
      }
    </section>

    <!-- Quick actions + catalog health -->
    <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="ws-card p-6 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h2 class="ws-h2">Catalog health</h2>
          <span class="ws-pill ws-pill-success">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Healthy
          </span>
        </div>

        @if (loading()) {
          <div class="py-12 text-center text-ink-500 text-sm">Fetching catalog summary…</div>
        } @else if (errorMsg()) {
          <div class="py-8 px-5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-700">
            <div class="font-semibold mb-1">Catalog API unreachable</div>
            <div class="text-sm">{{ errorMsg() }}</div>
            <div class="text-xs text-ink-500 mt-2">
              Start the service with <code class="font-mono text-brand-700">npm run run:local:middleware:product-catalog</code>.
            </div>
          </div>
        } @else {
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div class="p-4 rounded-xl bg-brand-50/60 border border-brand-100">
              <div class="text-xs text-ink-500 font-semibold">Total products</div>
              <div class="font-display text-2xl font-bold text-brand-800 mt-1">
                {{ totalProducts() | number }}
              </div>
            </div>
            <div class="p-4 rounded-xl bg-accent-500/10 border border-accent-500/20">
              <div class="text-xs text-ink-500 font-semibold">Asset classes</div>
              <div class="font-display text-2xl font-bold text-accent-700 mt-1">
                {{ assetClassCount() }}
              </div>
            </div>
            <div class="p-4 rounded-xl bg-gold-500/15 border border-gold-500/25">
              <div class="text-xs text-ink-500 font-semibold">Issuers</div>
              <div class="font-display text-2xl font-bold text-gold-700 mt-1">
                {{ issuerCount() }}+
              </div>
            </div>
          </div>
        }
      </div>

      <div class="ws-card p-6">
        <h2 class="ws-h2 mb-4">Quick actions</h2>
        <div class="flex flex-col gap-2">
          <a routerLink="/domain-services/product-catalog"
             class="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50 transition-colors duration-200">
            <div class="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500
                        flex items-center justify-center text-white text-xs font-bold">VA</div>
            <div class="flex-1">
              <div class="font-semibold text-sm text-ink-900">View all products</div>
              <div class="text-xs text-ink-500">Paginated grid with facets</div>
            </div>
          </a>
          <a routerLink="/domain-services/product-catalog/create"
             class="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50 transition-colors duration-200">
            <div class="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-accent-500
                        flex items-center justify-center text-white text-xs font-bold">CR</div>
            <div class="flex-1">
              <div class="font-semibold text-sm text-ink-900">Create product</div>
              <div class="text-xs text-ink-500">Validated admin form</div>
            </div>
          </a>
          <a routerLink="/domain-services/product-catalog/initial-load"
             class="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50 transition-colors duration-200">
            <div class="h-9 w-9 rounded-lg bg-gradient-to-br from-gold-500 to-coral-500
                        flex items-center justify-center text-white text-xs font-bold">IL</div>
            <div class="flex-1">
              <div class="font-semibold text-sm text-ink-900">Initial Data Load</div>
              <div class="text-xs text-ink-500">Idempotent UPSERT</div>
            </div>
          </a>
        </div>
      </div>
    </section>
  `,
})
export class DashboardComponent {
  private readonly catalog = inject(ProductCatalogService);

  readonly loading = signal<boolean>(true);
  readonly errorMsg = signal<string | null>(null);
  readonly totalProducts = signal<number>(0);
  readonly assetClassCount = signal<number>(0);
  readonly issuerCount = signal<number>(0);

  readonly scoredToday = signal<string>(this.formatNumber(18_244));

  readonly kpis = signal<KpiTile[]>([
    {
      label: "Form-completion AUC",
      value: "0.862",
      change: "+0.014 vs last retrain",
      gradient: "linear-gradient(135deg, #4F46E5, #06B6D4)",
      iconPath: "M4 17l5-5 4 4 7-7",
    },
    {
      label: "Offer accept rate",
      value: "23.4%",
      change: "+3.1% WoW",
      gradient: "linear-gradient(135deg, #10B981, #06B6D4)",
      iconPath: "M3 12l3 3 5-5 4 4 6-8",
    },
    {
      label: "Catalog freshness",
      value: "< 5 min",
      change: "UPSERT 12:52 UTC",
      gradient: "linear-gradient(135deg, #F59E0B, #F97316)",
      iconPath: "M12 7v5l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      label: "DAG success rate (7d)",
      value: "99.1%",
      change: "1 retry, 0 failures",
      gradient: "linear-gradient(135deg, #EC4899, #7C3AED)",
      iconPath: "M5 13l4 4L19 7",
    },
  ]);

  constructor() {
    this.catalog.categories().subscribe({
      next: (c) => {
        this.totalProducts.set(c.total_products);
        this.assetClassCount.set(c.asset_class.length);
        this.issuerCount.set(30);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg.set(err.message || "Unknown error");
        this.loading.set(false);
      },
    });
  }

  private formatNumber(n: number): string {
    return new Intl.NumberFormat().format(n);
  }
}
