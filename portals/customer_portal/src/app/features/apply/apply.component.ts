import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";

import { CustomerService } from "../../core/services/customer.service";
import { ProductCatalogService } from "../../core/services/product-catalog.service";
import { ApplicationDraft, Product } from "../../core/models/product.model";

type StepId = 1 | 2 | 3 | 4;

@Component({
  selector: "ws-apply",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-[1400px] mx-auto px-6 py-10">
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/products" class="ws-btn-ghost">
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
            <path fill-rule="evenodd" clip-rule="evenodd"
              d="M9.7 15.7a1 1 0 01-1.4 0l-5-5a1 1 0 010-1.4l5-5a1 1 0 011.4 1.4L6.4 9H16a1 1 0 110 2H6.4l3.3 3.3a1 1 0 010 1.4z"/>
          </svg>
          Back to products
        </a>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <!-- Main form panel -->
        <section class="ws-card p-8">
          <div class="flex items-center gap-3 mb-6">
            @for (step of steps; track step.id) {
              <div class="flex items-center gap-2">
                <div class="h-9 w-9 rounded-full flex items-center justify-center
                            font-semibold text-sm transition-all duration-250"
                     [class.bg-horizon]="activeStep() >= step.id"
                     [class.text-white]="activeStep() >= step.id"
                     [class.bg-surface-100]="activeStep() < step.id"
                     [class.text-ink-500]="activeStep() < step.id">
                  {{ step.id }}
                </div>
                <div class="text-sm font-semibold hidden md:block"
                     [class.text-ink-900]="activeStep() >= step.id"
                     [class.text-ink-300]="activeStep() < step.id">
                  {{ step.label }}
                </div>
              </div>
              @if (!$last) {
                <div class="flex-1 h-[3px] rounded-full bg-surface-100 min-w-[20px]">
                  <div class="h-full rounded-full transition-all duration-400"
                       [style.width]="activeStep() > step.id ? '100%' : '0%'"
                       [style.background]="'linear-gradient(135deg, #0EA5E9, #10B981)'"></div>
                </div>
              }
            }
          </div>

          <h1 class="ws-h2 mb-6">{{ currentStep().label }}</h1>

          <!-- Step 1: Identity -->
          @if (activeStep() === 1) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="flex flex-col gap-2 md:col-span-2">
                <span class="text-sm font-semibold text-ink-700">Full legal name</span>
                <input class="ws-field" [(ngModel)]="fullName" (blur)="persist()"
                       placeholder="e.g. Kishore Veleti"/>
              </label>
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-ink-700">Email</span>
                <input type="email" class="ws-field" [(ngModel)]="email" (blur)="persist()"
                       placeholder="you@example.com"/>
              </label>
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-ink-700">Date of birth</span>
                <input type="date" class="ws-field" [(ngModel)]="dob" (blur)="persist()"/>
              </label>
            </div>
          }

          <!-- Step 2: Financials -->
          @if (activeStep() === 2) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-ink-700">Employment status</span>
                <select class="ws-field" [(ngModel)]="employment" (change)="persist()">
                  <option value="">Select…</option>
                  <option>Employed</option>
                  <option>Self-Employed</option>
                  <option>Retired</option>
                  <option>Student</option>
                  <option>Unemployed</option>
                </select>
              </label>
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-ink-700">Annual income</span>
                <input type="number" class="ws-field" [(ngModel)]="income" (blur)="persist()"
                       placeholder="35000"/>
              </label>
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-ink-700">Existing wealth</span>
                <input type="number" class="ws-field" [(ngModel)]="wealth" (blur)="persist()"
                       placeholder="25000"/>
              </label>
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-ink-700">Risk comfort (0–100)</span>
                <input type="range" min="0" max="100" [(ngModel)]="riskScore" (change)="persist()"
                       class="accent-sky-500 mt-4"/>
                <span class="text-xs text-ink-500">{{ riskScore() }}/100</span>
              </label>
            </div>
          }

          <!-- Step 3: Product-specific placeholder -->
          @if (activeStep() === 3) {
            <div class="p-5 rounded-2xl bg-sky-50 border border-sky-200 mb-4">
              <div class="font-semibold text-sky-900 mb-1">Product-specific questions</div>
              <p class="text-sm text-sky-800">
                Additional disclosures for <code class="font-mono">{{ sku }}</code> go here —
                ISA allowance, pension contribution cap, contribution schedule, etc.
                This step is dynamic per product_type.
              </p>
            </div>
            <label class="flex items-center gap-3 p-4 rounded-xl border border-surface-200 cursor-pointer hover:bg-surface-50">
              <input type="checkbox" [(ngModel)]="confirmation" (change)="persist()"
                     class="accent-sky-500 h-5 w-5"/>
              <span class="text-sm text-ink-700">
                I confirm the information I've provided is accurate.
              </span>
            </label>
          }

          <!-- Step 4: Review & submit -->
          @if (activeStep() === 4) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-4 rounded-xl bg-sky-50 border border-sky-100">
                <div class="text-xs uppercase tracking-wide text-ink-500 font-semibold mb-1">Full name</div>
                <div class="font-semibold">{{ fullName() || '—' }}</div>
              </div>
              <div class="p-4 rounded-xl bg-sky-50 border border-sky-100">
                <div class="text-xs uppercase tracking-wide text-ink-500 font-semibold mb-1">Email</div>
                <div class="font-semibold">{{ email() || '—' }}</div>
              </div>
              <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div class="text-xs uppercase tracking-wide text-ink-500 font-semibold mb-1">Employment</div>
                <div class="font-semibold">{{ employment() || '—' }}</div>
              </div>
              <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div class="text-xs uppercase tracking-wide text-ink-500 font-semibold mb-1">Income</div>
                <div class="font-semibold">{{ income() ? ('£' + income()) : '—' }}</div>
              </div>
            </div>

            @if (submitted()) {
              <div class="mt-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 10-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"/>
                  </svg>
                </div>
                <div>
                  <div class="font-semibold text-emerald-700">Application submitted</div>
                  <div class="text-sm text-emerald-800">
                    We'll email you next steps at {{ email() }}.
                  </div>
                </div>
              </div>
            }
          }

          <!-- Step controls -->
          <div class="flex items-center justify-between mt-8 pt-6 border-t border-surface-100">
            <button class="ws-btn-ghost" (click)="back()" [disabled]="activeStep() === 1">
              &larr; Back
            </button>

            @if (activeStep() < 4) {
              <button class="ws-btn-primary" (click)="next()">
                Continue
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M10.3 4.3a1 1 0 011.4 0l5 5a1 1 0 010 1.4l-5 5a1 1 0 01-1.4-1.4L13.6 11H4a1 1 0 110-2h9.6l-3.3-3.3a1 1 0 010-1.4z"/>
                </svg>
              </button>
            } @else if (!submitted()) {
              <button class="ws-btn-primary" (click)="submit()" [disabled]="submitting()">
                @if (submitting()) {
                  <span class="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                  Submitting…
                } @else {
                  Submit application
                }
              </button>
            } @else {
              <a routerLink="/" class="ws-btn-accent">
                Back to home
              </a>
            }
          </div>
        </section>

        <!-- Side summary -->
        <aside class="ws-card p-6 h-fit">
          <div class="text-xs uppercase tracking-[0.18em] text-ink-500 font-bold mb-2">You're applying for</div>
          @if (product(); as p) {
            <div class="flex items-center gap-3 mb-3">
              <div class="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-soft"
                   [style.background]="gradientFor(p.asset_class)">
                {{ abbrev(p.asset_class) }}
              </div>
              <div class="min-w-0">
                <div class="font-semibold text-ink-900 leading-snug truncate">{{ p.name }}</div>
                <div class="text-xs text-ink-500 font-mono truncate">{{ p.sku }}</div>
              </div>
            </div>
            <p class="text-sm text-ink-500 leading-relaxed mb-4">{{ p.short_description }}</p>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="p-3 rounded-xl bg-surface-50">
                <div class="text-xs text-ink-500 font-semibold">Issuer</div>
                <div class="font-semibold">{{ p.issuer }}</div>
              </div>
              <div class="p-3 rounded-xl bg-surface-50">
                <div class="text-xs text-ink-500 font-semibold">SRRI</div>
                <div class="font-semibold">{{ p.risk_level }}/7</div>
              </div>
              <div class="p-3 rounded-xl bg-surface-50">
                <div class="text-xs text-ink-500 font-semibold">Min invest</div>
                <div class="font-semibold">{{ p.currency }} {{ formatNumber(p.min_investment) }}</div>
              </div>
              <div class="p-3 rounded-xl bg-surface-50">
                <div class="text-xs text-ink-500 font-semibold">Fee</div>
                <div class="font-semibold">{{ p.fee_bps }} bps</div>
              </div>
            </div>
          } @else if (loadingProduct()) {
            <div class="py-10 text-center text-ink-500 text-sm">Loading product…</div>
          } @else {
            <div class="py-10 text-center text-ink-500 text-sm">
              Product not found. <a routerLink="/products" class="text-sky-700 font-semibold">Browse all products</a>.
            </div>
          }

          <div class="mt-6 p-4 rounded-xl bg-sky-50 border border-sky-100 text-sm text-sky-900">
            <div class="font-semibold mb-1">Your draft is saved as you type.</div>
            <div class="text-xs text-sky-800 leading-relaxed">
              Even if you close this page, WealthSignal can email you a personalised
              offer based on what you've shared so far.
            </div>
          </div>
        </aside>
      </div>
    </section>
  `,
})
export class ApplyComponent implements OnInit {
  private readonly customer = inject(CustomerService);
  private readonly catalog = inject(ProductCatalogService);
  private readonly router = inject(Router);

  @Input() sku = "";

  readonly activeStep = signal<StepId>(1);
  readonly steps = [
    { id: 1 as StepId, label: "Identity" },
    { id: 2 as StepId, label: "Financials" },
    { id: 3 as StepId, label: "Product details" },
    { id: 4 as StepId, label: "Review & submit" },
  ];

  readonly product = signal<Product | null>(null);
  readonly loadingProduct = signal<boolean>(true);

  // Form fields
  readonly fullName = signal<string>("");
  readonly email = signal<string>("");
  readonly dob = signal<string>("");
  readonly employment = signal<string>("");
  readonly income = signal<number | null>(null);
  readonly wealth = signal<number | null>(null);
  readonly riskScore = signal<number>(50);
  readonly confirmation = signal<boolean>(false);

  readonly draftId = signal<string | null>(null);
  readonly submitting = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);

  ngOnInit(): void {
    if (this.sku) {
      this.catalog.getBySku(this.sku).subscribe({
        next: (p) => {
          this.product.set(p);
          this.loadingProduct.set(false);
        },
        error: () => this.loadingProduct.set(false),
      });
    } else {
      this.loadingProduct.set(false);
    }
  }

  currentStep(): { id: StepId; label: string } {
    return this.steps[this.activeStep() - 1];
  }

  next(): void {
    if (this.activeStep() < 4) {
      this.persist();
      this.activeStep.update((s) => (s + 1) as StepId);
    }
  }

  back(): void {
    if (this.activeStep() > 1) {
      this.activeStep.update((s) => (s - 1) as StepId);
    }
  }

  /** Persist every change to customer_api (draft save, analogous to every-keystroke save). */
  persist(): void {
    const payload = {
      product_sku: this.sku,
      current_step: this.activeStep(),
      identity: {
        full_name: this.fullName() || null,
        email: this.email() || null,
        date_of_birth: this.dob() || null,
      },
      financials: {
        employment_status: this.employment() || null,
        annual_income: this.income() != null ? String(this.income()) : null,
        existing_wealth: this.wealth() != null ? String(this.wealth()) : null,
        risk_questionnaire_score: this.riskScore(),
      },
    };

    const id = this.draftId();
    const req = id
      ? this.customer.updateDraft(id, payload)
      : this.customer.createDraft(payload);

    req.subscribe({
      next: (draft: ApplicationDraft) => this.draftId.set(draft.id),
      error: (err: HttpErrorResponse) => {
        // Draft persistence is best-effort — never block the UI.
        console.warn("draft persist failed:", err.message);
      },
    });
  }

  submit(): void {
    const id = this.draftId();
    if (!id) {
      this.persist();
      return;
    }
    this.submitting.set(true);
    this.customer.submit(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.submitted.set(true); // optimistic UX for the demo
      },
    });
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
}
