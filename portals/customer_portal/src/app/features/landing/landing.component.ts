import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { CommonModule, DecimalPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";

import { ProductCatalogService } from "../../core/services/product-catalog.service";
import { NlpSearchHit } from "../../core/models/product.model";

interface Pillar {
  title: string;
  body: string;
  gradient: string;
  iconPath: string;
}

@Component({
  selector: "ws-landing",
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Hero with embedded NLP search -->
    <section class="relative overflow-hidden pt-10 pb-20 md:pt-16 md:pb-28">
      <div class="absolute -top-10 -left-20 h-[480px] w-[480px] rounded-full
                  bg-sky-500/20 blur-3xl pointer-events-none"></div>
      <div class="absolute top-20 -right-20 h-[380px] w-[380px] rounded-full
                  bg-emerald-500/20 blur-3xl pointer-events-none"></div>
      <div class="absolute bottom-0 left-1/3 h-[320px] w-[320px] rounded-full
                  bg-gold-500/10 blur-3xl pointer-events-none"></div>

      <div class="relative z-10 max-w-[1200px] mx-auto px-6 text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full
                    bg-white shadow-soft text-sky-700 text-xs font-bold tracking-wide mb-6">
          <span class="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
          Personalised by the WealthSignal decision engine
        </div>

        <h1 class="ws-h1 mb-5">
          Your money, on a
          <span class="relative inline-block">
            <span class="relative z-10 bg-clip-text text-transparent"
                  style="background-image: linear-gradient(120deg, #0EA5E9 0%, #10B981 50%, #F59E0B 100%);">
              smarter path.
            </span>
            <svg viewBox="0 0 300 20" class="absolute -bottom-2 left-0 w-full" preserveAspectRatio="none">
              <path d="M2 14 Q 80 2, 150 10 T 298 8" stroke="#F59E0B" stroke-width="3"
                    stroke-linecap="round" fill="none" opacity="0.75"/>
            </svg>
          </span>
        </h1>

        <p class="text-lg md:text-xl text-ink-500 max-w-2xl mx-auto leading-relaxed">
          Describe what you want in plain English. We'll match you to the right
          wealth-management product — from ISAs to SIPPs to global funds.
        </p>

        <!-- NLP search bar -->
        <div class="mt-10 max-w-3xl mx-auto">
          <div class="ws-card p-2 flex items-center gap-2">
            <div class="pl-4">
              <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6 text-sky-500">
                <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
                <path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <input
              class="flex-1 px-2 py-3 text-base bg-transparent outline-none placeholder-ink-300"
              placeholder="e.g. tax-efficient ISA for a first-time investor"
              [(ngModel)]="query"
              (keyup.enter)="search()"/>
            <button class="ws-btn-primary" (click)="search()" [disabled]="searching()">
              @if (searching()) {
                <span class="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                Searching
              } @else {
                <span>Search</span>
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M10.3 4.3a1 1 0 011.4 0l5 5a1 1 0 010 1.4l-5 5a1 1 0 01-1.4-1.4L13.6 11H4a1 1 0 110-2h9.6l-3.3-3.3a1 1 0 010-1.4z"/>
                </svg>
              }
            </button>
          </div>

          <!-- Sample queries -->
          <div class="flex flex-wrap items-center justify-center gap-2 mt-4 text-sm">
            <span class="text-ink-500">Try:</span>
            @for (sample of samples; track sample) {
              <button
                class="px-3 py-1 rounded-full bg-white border border-surface-200
                       text-ink-700 hover:text-sky-700 hover:border-sky-300
                       transition-colors duration-200"
                (click)="trySample(sample)">
                {{ sample }}
              </button>
            }
          </div>
        </div>

        <!-- Search results -->
        @if (hits().length > 0) {
          <div class="mt-12 text-left">
            <h2 class="ws-h2 mb-5 text-center">
              Top matches for <span class="text-sky-600">"{{ lastQuery() }}"</span>
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              @for (hit of hits(); track hit.product.id) {
                <div class="ws-product-card" (click)="apply(hit.product.sku)">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="h-11 w-11 rounded-xl flex items-center justify-center text-white
                                text-xs font-bold shadow-soft"
                         [style.background]="gradientFor(hit.product.asset_class)">
                      {{ abbrev(hit.product.asset_class) }}
                    </div>
                    <span class="ws-pill ws-pill-emerald ml-auto">
                      {{ hit.score.toFixed(0) }}% match
                    </span>
                  </div>
                  <div class="font-semibold text-ink-900 leading-snug mb-1 line-clamp-2">
                    {{ hit.product.name }}
                  </div>
                  <div class="text-xs text-ink-500 mb-3">
                    {{ hit.product.issuer }} · SRRI {{ hit.product.risk_level }}/7
                  </div>
                  <div class="text-sm text-ink-500 line-clamp-2 mb-3">
                    {{ hit.product.short_description }}
                  </div>
                  @if (hit.matched_terms.length > 0) {
                    <div class="flex flex-wrap gap-1.5">
                      @for (t of hit.matched_terms.slice(0, 3); track t) {
                        <span class="ws-pill ws-pill-sky">{{ t }}</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        } @else if (errorMsg()) {
          <div class="mt-10 max-w-2xl mx-auto p-6 rounded-2xl bg-coral-500/5 border border-coral-500/20 text-left">
            <div class="font-semibold text-coral-500 mb-1">Couldn't reach the catalogue</div>
            <div class="text-sm text-ink-700">{{ errorMsg() }}</div>
            <div class="text-xs text-ink-500 mt-2">
              Start the service locally:
              <code class="font-mono text-sky-700">npm run run:local:middleware:product-catalog</code>
            </div>
          </div>
        }
      </div>
    </section>

    <!-- Value pillars -->
    <section class="max-w-[1200px] mx-auto px-6 py-14">
      <div class="text-center mb-12">
        <div class="inline-block ws-pill ws-pill-sky mb-3">Why WealthSignal</div>
        <h2 class="ws-h2">A wealth manager who actually gets you.</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        @for (pillar of pillars; track pillar.title) {
          <div class="ws-card p-6">
            <div class="h-12 w-12 rounded-2xl flex items-center justify-center text-white mb-4 shadow-glow"
                 [style.background]="pillar.gradient">
              <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5">
                <path [attr.d]="pillar.iconPath" stroke="currentColor" stroke-width="2.2"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="font-display text-lg font-semibold text-ink-900 mb-1">
              {{ pillar.title }}
            </div>
            <p class="text-sm text-ink-500 leading-relaxed">{{ pillar.body }}</p>
          </div>
        }
      </div>
    </section>

    <!-- CTA strip -->
    <section class="max-w-[1400px] mx-auto px-6 pb-14">
      <div class="ws-card-horizon p-8 md:p-12 relative overflow-hidden">
        <div class="absolute -right-32 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"></div>
        <div class="absolute -left-16 -bottom-24 h-64 w-64 rounded-full bg-gold-500/25 blur-3xl"></div>

        <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div class="flex-1">
            <div class="font-display text-2xl md:text-3xl font-bold mb-2">
              Partial form? No problem.
            </div>
            <p class="text-white/90 max-w-2xl">
              If you drop off mid-application, we use your partial data to
              hand-pick a better-fit product and email it directly to you.
              No cold calls. No pressure. Just a smarter second chance.
            </p>
          </div>
          <a routerLink="/products" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                                            bg-white text-sky-700 font-semibold shadow-panel
                                            hover:shadow-glow transition-all duration-250">
            Browse all products
            <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
              <path fill-rule="evenodd" clip-rule="evenodd"
                d="M10.3 4.3a1 1 0 011.4 0l5 5a1 1 0 010 1.4l-5 5a1 1 0 01-1.4-1.4L13.6 11H4a1 1 0 110-2h9.6l-3.3-3.3a1 1 0 010-1.4z"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  `,
})
export class LandingComponent {
  private readonly catalog = inject(ProductCatalogService);
  private readonly router = inject(Router);

  readonly query = signal<string>("");
  readonly lastQuery = signal<string>("");
  readonly hits = signal<NlpSearchHit[]>([]);
  readonly searching = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  readonly samples = [
    "tax-efficient ISA for first-time investor",
    "retirement income fund",
    "sustainable ESG equity",
    "low-risk cash account",
  ];

  readonly pillars: Pillar[] = [
    {
      title: "Plain-English search",
      body: "Tell us what you're looking for. Our NLP engine understands your goals and suggests matching products across 10,000+ options.",
      gradient: "linear-gradient(135deg, #0EA5E9, #06B6D4)",
      iconPath: "M11 17a7 7 0 117-7M21 21l-3.5-3.5",
    },
    {
      title: "Personalised offers",
      body: "The WealthSignal decision engine scores every customer on completion likelihood, risk appetite, and next-best-action — so you see offers that actually fit.",
      gradient: "linear-gradient(135deg, #10B981, #06B6D4)",
      iconPath: "M13 2L3 14h7l-2 8 10-12h-7l2-8z",
    },
    {
      title: "FCA-compliant by design",
      body: "Every recommendation is reviewed by an automated compliance layer — no guaranteed returns, no pressure language, ever.",
      gradient: "linear-gradient(135deg, #F59E0B, #F43F5E)",
      iconPath: "M12 3l8 4v6c0 5-3.5 8.4-8 9-4.5-.6-8-4-8-9V7l8-4z",
    },
  ];

  trySample(s: string): void {
    this.query.set(s);
    this.search();
  }

  search(): void {
    const q = this.query().trim();
    if (q.length < 2) return;

    this.searching.set(true);
    this.errorMsg.set(null);
    this.lastQuery.set(q);

    this.catalog.searchNlp({ query: q, top_k: 6 }).subscribe({
      next: (res) => {
        this.hits.set(res.hits);
        this.searching.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg.set(err.message || "Search failed");
        this.hits.set([]);
        this.searching.set(false);
      },
    });
  }

  apply(sku: string): void {
    this.router.navigate(["/apply", sku]);
  }

  abbrev(assetClass: string): string {
    const map: Record<string, string> = {
      "Equity": "EQ", "Fixed Income": "FI", "Multi-Asset": "MA",
      "Alternative": "AL", "Cash": "CS", "Commodity": "CO", "Real Estate": "RE",
    };
    return map[assetClass] || "—";
  }

  gradientFor(assetClass: string): string {
    const map: Record<string, string> = {
      "Equity":       "linear-gradient(135deg, #0EA5E9, #8B5CF6)",
      "Fixed Income": "linear-gradient(135deg, #06B6D4, #0EA5E9)",
      "Multi-Asset":  "linear-gradient(135deg, #10B981, #06B6D4)",
      "Alternative":  "linear-gradient(135deg, #F59E0B, #F43F5E)",
      "Cash":         "linear-gradient(135deg, #64748B, #334155)",
      "Commodity":    "linear-gradient(135deg, #EAB308, #F59E0B)",
      "Real Estate":  "linear-gradient(135deg, #F43F5E, #8B5CF6)",
    };
    return map[assetClass] || "linear-gradient(135deg, #0EA5E9, #10B981)";
  }
}
