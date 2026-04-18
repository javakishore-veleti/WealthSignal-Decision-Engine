import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from "@angular/core";
import { CommonModule, DatePipe, DecimalPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";

import { AdminService } from "../../core/services/admin.service";
import { JobResponse, JobStatus } from "../../core/models/product.model";

@Component({
  selector: "ws-initial-load",
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Breadcrumb -->
    <nav class="text-sm text-ink-500 mb-4 flex items-center gap-2">
      <span>Domain Services</span>
      <span class="text-ink-300">/</span>
      <span class="text-ink-700 font-semibold">Product Catalog</span>
      <span class="text-ink-300">/</span>
      <span class="text-brand-700 font-semibold">Initial Data Load Setup</span>
    </nav>

    <!-- Header card -->
    <section class="ws-card p-0 mb-8 overflow-hidden">
      <div class="relative p-8 md:p-10 text-white"
           style="background: linear-gradient(120deg, #F59E0B 0%, #F97316 45%, #EC4899 100%);">
        <div class="absolute -right-20 -top-16 h-80 w-80 rounded-full bg-white/10 blur-3xl"></div>
        <div class="relative z-10 max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur
                      text-xs font-semibold tracking-wide mb-4">
            ONE-TIME SETUP · IDEMPOTENT UPSERT
          </div>
          <h1 class="ws-h1 text-white mb-3">Initial Data Load</h1>
          <p class="text-white/90 text-lg leading-relaxed max-w-2xl">
            Loads the 10,000-product wealth-management catalogue into
            <code class="font-mono text-white/95 bg-white/20 px-1.5 py-0.5 rounded">product_catalog.products</code>
            via the <code class="font-mono text-white/95 bg-white/20 px-1.5 py-0.5 rounded">load_product_catalog</code>
            Airflow DAG. Safe to click more than once — existing rows are updated in place.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-surface-200">
        <div class="p-6 border-b md:border-b-0 md:border-r border-surface-200">
          <div class="text-xs uppercase tracking-[0.18em] font-bold text-ink-500 mb-2">Source</div>
          <div class="font-mono text-sm text-ink-900 break-all">
            data/product_catalog/products_seed.json
          </div>
          <div class="text-xs text-ink-500 mt-1">12.09 MB · 10,000 records</div>
        </div>
        <div class="p-6 border-b md:border-b-0 md:border-r border-surface-200">
          <div class="text-xs uppercase tracking-[0.18em] font-bold text-ink-500 mb-2">Destination</div>
          <div class="font-mono text-sm text-ink-900">Postgres · product_catalog.products</div>
          <div class="text-xs text-ink-500 mt-1">UPSERT ON CONFLICT (sku)</div>
        </div>
        <div class="p-6">
          <div class="text-xs uppercase tracking-[0.18em] font-bold text-ink-500 mb-2">Pipeline</div>
          <div class="font-mono text-sm text-ink-900">Airflow DAG · load_product_catalog</div>
          <div class="text-xs text-ink-500 mt-1">admin_api → data_management_api → Airflow</div>
        </div>
      </div>
    </section>

    <!-- Action card -->
    <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="ws-card p-6 lg:col-span-2">
        <h2 class="ws-h2 mb-4">Configure the run</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-ink-700">Seed JSON path (optional)</span>
            <input class="ws-field" [(ngModel)]="seedPath"
                   placeholder="data/product_catalog/products_seed.json"/>
            <span class="text-xs text-ink-500">
              Leave blank to use the committed seed file.
            </span>
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-ink-700">Mode</span>
            <div class="flex items-center gap-4 pt-1">
              <label class="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" [checked]="!dryRun()" (change)="dryRun.set(false)"
                       class="accent-brand-600 h-4 w-4"/>
                <span class="text-sm">Live UPSERT</span>
              </label>
              <label class="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" [checked]="dryRun()" (change)="dryRun.set(true)"
                       class="accent-gold-500 h-4 w-4"/>
                <span class="text-sm">Dry run</span>
              </label>
            </div>
            <span class="text-xs text-ink-500">
              Dry-run parses and validates the JSON but commits nothing.
            </span>
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button class="ws-btn-primary" (click)="trigger()" [disabled]="submitting() || isRunning()">
            @if (submitting()) {
              <span class="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
              Submitting…
            } @else if (isRunning()) {
              <span class="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
              Running…
            } @else {
              <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                <path d="M6.5 4.5a1 1 0 011.3-.9l8 4.5a1 1 0 010 1.8l-8 4.5A1 1 0 016.5 13.5v-9z"/>
              </svg>
              Start Initial Data Load
            }
          </button>

          @if (job()) {
            <button class="ws-btn-ghost" (click)="reset()">Clear result</button>
          }
          <div class="text-xs text-ink-500 flex-1 text-right">
            Triggers <code class="font-mono text-brand-700">POST /api/v1/product-catalog/initial-load</code>
            on admin_api
          </div>
        </div>

        @if (errorMsg()) {
          <div class="mt-5 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-700">
            <div class="font-semibold mb-1">Couldn't start the load</div>
            <div class="text-sm">{{ errorMsg() }}</div>
            <div class="text-xs text-ink-500 mt-2">
              Ensure admin_api is running: <code class="font-mono text-brand-700">npm run run:local:middleware:admin</code>
            </div>
          </div>
        }
      </div>

      <!-- Live job panel -->
      <div class="ws-card p-6 flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h2 class="ws-h2">Run status</h2>
          @if (job(); as j) {
            <span class="ws-pill" [class]="statusClass(j.status)">
              <span class="h-1.5 w-1.5 rounded-full" [style.background]="statusDotColor(j.status)"></span>
              {{ j.status | uppercase }}
            </span>
          } @else {
            <span class="ws-pill ws-pill-brand">IDLE</span>
          }
        </div>

        @if (!job()) {
          <div class="flex-1 flex flex-col items-center justify-center text-center py-10">
            <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500
                        flex items-center justify-center mb-4 shadow-glow">
              <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6 text-white">
                <path d="M4 4h16v4H4zM4 10h16v10H4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M8 14h4M8 17h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="text-sm text-ink-500 max-w-xs">
              Ready when you are. Click <span class="font-semibold text-ink-700">Start Initial Data Load</span>
              to begin.
            </div>
          </div>
        } @else {
          @if (job(); as j) {
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-ink-500">Job ID</span>
                <span class="font-mono text-xs text-ink-900">{{ j.job_id.slice(0, 18) }}…</span>
              </div>
              <div class="flex justify-between">
                <span class="text-ink-500">DAG</span>
                <span class="font-mono text-xs text-ink-900">{{ j.dag_id }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-ink-500">Submitted</span>
                <span class="text-ink-900">{{ j.submitted_at | date: 'mediumTime' }}</span>
              </div>
              @if (j.started_at) {
                <div class="flex justify-between">
                  <span class="text-ink-500">Started</span>
                  <span class="text-ink-900">{{ j.started_at | date: 'mediumTime' }}</span>
                </div>
              }
              @if (j.finished_at) {
                <div class="flex justify-between">
                  <span class="text-ink-500">Finished</span>
                  <span class="text-ink-900">{{ j.finished_at | date: 'mediumTime' }}</span>
                </div>
              }
            </div>

            @if (j.status === "succeeded" && j.counts) {
              <div class="mt-5 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div class="flex items-center gap-2 text-emerald-700 font-semibold mb-3">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 10-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"/>
                  </svg>
                  UPSERT complete
                </div>
                <div class="grid grid-cols-3 gap-2 text-center">
                  <div class="p-2 rounded-lg bg-white">
                    <div class="text-xs text-ink-500">Inserted</div>
                    <div class="font-display font-bold text-emerald-600 text-lg">
                      {{ j.counts.inserted | number }}
                    </div>
                  </div>
                  <div class="p-2 rounded-lg bg-white">
                    <div class="text-xs text-ink-500">Updated</div>
                    <div class="font-display font-bold text-brand-600 text-lg">
                      {{ j.counts.updated | number }}
                    </div>
                  </div>
                  <div class="p-2 rounded-lg bg-white">
                    <div class="text-xs text-ink-500">Total</div>
                    <div class="font-display font-bold text-ink-900 text-lg">
                      {{ j.counts.total_records_processed | number }}
                    </div>
                  </div>
                </div>
              </div>
            }

            @if (j.status === "running" || j.status === "queued") {
              <div class="mt-5">
                <div class="h-2 rounded-full bg-surface-200 overflow-hidden">
                  <div class="h-full bg-aurora animate-pulse" style="width: 60%"></div>
                </div>
                <div class="text-xs text-ink-500 mt-2 text-center">
                  Polling admin_api every 2 seconds…
                </div>
              </div>
            }
          }
        }
      </div>
    </section>
  `,
})
export class InitialLoadComponent implements OnDestroy {
  private readonly admin = inject(AdminService);

  readonly seedPath = signal<string>("");
  readonly dryRun = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly job = signal<JobResponse | null>(null);
  readonly errorMsg = signal<string | null>(null);

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  isRunning(): boolean {
    const j = this.job();
    return j !== null && (j.status === "queued" || j.status === "running");
  }

  trigger(): void {
    this.errorMsg.set(null);
    this.submitting.set(true);
    this.admin
      .triggerInitialLoad({
        seed_path: this.seedPath() || null,
        dry_run: this.dryRun(),
      })
      .subscribe({
        next: (j) => {
          this.submitting.set(false);
          this.job.set(j);
          if (j.status === "queued" || j.status === "running") {
            this.startPolling(j.job_id);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMsg.set(err.message || "Request failed");
        },
      });
  }

  private startPolling(jobId: string): void {
    this.stopPolling();
    this.pollHandle = setInterval(() => {
      this.admin.pollJob(jobId).subscribe({
        next: (j) => {
          this.job.set(j);
          if (j.status === "succeeded" || j.status === "failed") {
            this.stopPolling();
          }
        },
        error: () => this.stopPolling(),
      });
    }, 2000);
  }

  private stopPolling(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  reset(): void {
    this.stopPolling();
    this.job.set(null);
    this.errorMsg.set(null);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  statusClass(status: JobStatus): string {
    switch (status) {
      case "succeeded": return "ws-pill-success";
      case "running":
      case "queued":    return "ws-pill-info";
      case "failed":    return "ws-pill-danger";
    }
  }

  statusDotColor(status: JobStatus): string {
    switch (status) {
      case "succeeded": return "#10B981";
      case "running":
      case "queued":    return "#06B6D4";
      case "failed":    return "#EF4444";
    }
  }
}
