import { ChangeDetectionStrategy, Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";

/**
 * Criteria-based search placeholder. Full form wiring will come next —
 * the POST /api/v1/products/search/criteria endpoint already exists on
 * product_catalog_api; this is the UI scaffold.
 */
@Component({
  selector: "ws-product-search",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="text-sm text-ink-500 mb-4 flex items-center gap-2">
      <span>Domain Services</span>
      <span class="text-ink-300">/</span>
      <a routerLink="/domain-services/product-catalog" class="hover:text-brand-700">Product Catalog</a>
      <span class="text-ink-300">/</span>
      <span class="text-brand-700 font-semibold">Search</span>
    </nav>

    <h1 class="ws-h1 mb-2">Criteria-based search</h1>
    <p class="ws-subtle mb-6">
      Combine any number of filters below. Hits
      <code class="font-mono text-brand-700">POST /api/v1/products/search/criteria</code>.
    </p>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section class="ws-card p-6 lg:col-span-1">
        <h2 class="ws-h2 mb-4">Filters</h2>
        <div class="flex flex-col gap-4">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-ink-700">Asset class</span>
            <select class="ws-field"><option>Any</option></select>
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-ink-700">Product type</span>
            <select class="ws-field"><option>Any</option></select>
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-ink-700">Risk level range</span>
            <div class="flex items-center gap-2">
              <input class="ws-field" type="number" min="1" max="7" placeholder="Min"/>
              <span class="text-ink-400">—</span>
              <input class="ws-field" type="number" min="1" max="7" placeholder="Max"/>
            </div>
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-ink-700">Geography</span>
            <select class="ws-field"><option>Any</option></select>
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-ink-700">Target segment</span>
            <select class="ws-field"><option>Any</option></select>
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-ink-700">Issuer contains</span>
            <input class="ws-field" placeholder="BlackRock"/>
          </label>

          <div class="flex items-center gap-3 pt-2">
            <button class="ws-btn-primary flex-1" disabled>Search</button>
            <button class="ws-btn-ghost" disabled>Reset</button>
          </div>
        </div>
      </section>

      <section class="ws-card p-10 lg:col-span-2 flex flex-col items-center justify-center text-center">
        <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent-500 to-brand-500
                    flex items-center justify-center mb-4 shadow-glow">
          <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6 text-white">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
            <path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="font-semibold text-ink-900 mb-1">Compose filters, then search</div>
        <div class="text-sm text-ink-500 max-w-md">
          Results will appear here as a responsive grid. Wiring to the API is the next PR.
        </div>
      </section>
    </div>
  `,
})
export class ProductSearchComponent {}
