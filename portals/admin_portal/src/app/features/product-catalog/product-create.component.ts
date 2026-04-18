import { ChangeDetectionStrategy, Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";

/**
 * Create product — form-only skeleton. Wiring to POST /api/v1/products
 * is intentionally deferred until the admin-auth story is in place, to
 * avoid accepting unauthenticated writes.
 */
@Component({
  selector: "ws-product-create",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="text-sm text-ink-500 mb-4 flex items-center gap-2">
      <span>Domain Services</span>
      <span class="text-ink-300">/</span>
      <a routerLink="/domain-services/product-catalog" class="hover:text-brand-700">Product Catalog</a>
      <span class="text-ink-300">/</span>
      <span class="text-brand-700 font-semibold">Create</span>
    </nav>

    <h1 class="ws-h1 mb-2">Create a new product</h1>
    <p class="ws-subtle mb-6">
      Admin-only. Submissions hit
      <code class="font-mono text-brand-700">POST /api/v1/products</code> — wiring lands alongside the auth story.
    </p>

    <section class="ws-card p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-ink-700">Product name</span>
          <input class="ws-field" placeholder="e.g. BlackRock Global Growth Equity Fund"/>
        </label>
        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-ink-700">SKU</span>
          <input class="ws-field font-mono" placeholder="WM-EQ-GBL-00001"/>
        </label>
        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-ink-700">Issuer</span>
          <input class="ws-field" placeholder="BlackRock"/>
        </label>
        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-ink-700">Asset class</span>
          <select class="ws-field">
            <option>Equity</option>
            <option>Fixed Income</option>
            <option>Multi-Asset</option>
            <option>Alternative</option>
            <option>Cash</option>
            <option>Commodity</option>
            <option>Real Estate</option>
          </select>
        </label>
        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-ink-700">Risk level (SRRI)</span>
          <input class="ws-field" type="number" min="1" max="7" value="4"/>
        </label>
        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-ink-700">Min investment</span>
          <input class="ws-field" type="number" placeholder="1000"/>
        </label>
      </div>

      <label class="flex flex-col gap-2 mt-5">
        <span class="text-sm font-semibold text-ink-700">Short description</span>
        <textarea class="ws-field min-h-[80px]" rows="3"
          placeholder="One-sentence pitch — this appears on every product card."></textarea>
      </label>

      <div class="flex items-center gap-3 mt-6">
        <button class="ws-btn-primary" disabled>
          Save draft
        </button>
        <button class="ws-btn-ghost" disabled>Cancel</button>
        <span class="text-xs text-ink-500 ml-auto">Disabled until admin auth lands.</span>
      </div>
    </section>
  `,
})
export class ProductCreateComponent {}
