import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";

import { AdminService } from "../../core/services/admin.service";
import { JobResponse, JobStatus } from "../../core/models/product.model";

interface ExperimentSlot {
  name: string;
  kind: "production" | "mastery";
  gradient: string;
  description: string;
}

@Component({
  selector: "ws-mlflow-experiments",
  standalone: true,
  imports: [CommonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Breadcrumb -->
    <nav class="text-sm text-ink-500 mb-4 flex items-center gap-2">
      <span>Administration</span>
      <span class="text-ink-300">/</span>
      <span class="text-ink-700 font-semibold">System Settings</span>
      <span class="text-ink-300">/</span>
      <span class="text-brand-700 font-semibold">MLflow Experiments</span>
    </nav>

    <!-- Hero -->
    <section class="ws-card p-0 mb-8 overflow-hidden">
      <div class="relative p-8 md:p-10 text-white"
           style="background: linear-gradient(120deg, #4F46E5 0%, #7C3AED 45%, #06B6D4 100%);">
        <div class="absolute -right-20 -top-16 h-80 w-80 rounded-full bg-white/10 blur-3xl"></div>
        <div class="relative z-10 max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur
                      text-xs font-semibold tracking-wide mb-4">
            IDEMPOTENT · ONE-TIME BOOTSTRAP
          </div>
          <h1 class="ws-h1 text-white mb-3">MLflow Experiments</h1>
          <p class="text-white/90 text-lg leading-relaxed max-w-2xl">
            Ensure the eight experiment slots the Decision Engine relies on
            exist in MLflow — four for production runs
            (<code class="font-mono text-white/95 bg-white/20 px-1.5 py-0.5 rounded">wealth-*</code>)
            and four namespaced for PyTorch-mastery learning
            (<code class="font-mono text-white/95 bg-white/20 px-1.5 py-0.5 rounded">mastery/wealth-*</code>).
            Safe to click more than once; existing experiments just get their canonical tags refreshed.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-surface-200">
        <div class="p-6 border-b md:border-b-0 md:border-r border-surface-200">
          <div class="text-xs uppercase tracking-[0.18em] font-bold text-ink-500 mb-2">Trigger</div>
          <div class="font-mono text-sm text-ink-900 break-all">
            POST /api/v1/mlflow/bootstrap-experiments
          </div>
          <div class="text-xs text-ink-500 mt-1">admin_api on :8001</div>
        </div>
        <div class="p-6 border-b md:border-b-0 md:border-r border-surface-200">
          <div class="text-xs uppercase tracking-[0.18em] font-bold text-ink-500 mb-2">Execution</div>
          <div class="font-mono text-sm text-ink-900">Airflow DAG · bootstrap_mlflow_experiments</div>
          <div class="text-xs text-ink-500 mt-1">schedule=None, manual trigger only</div>
        </div>
        <div class="p-6">
          <div class="text-xs uppercase tracking-[0.18em] font-bold text-ink-500 mb-2">Target</div>
          <div class="font-mono text-sm text-ink-900">MLflow · 8 experiments</div>
          <div class="text-xs text-ink-500 mt-1">
            <a href="http://localhost:5050" target="_blank"
               class="text-brand-700 font-semibold hover:underline">Open MLflow UI ↗</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Action + status -->
    <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div class="ws-card p-6 lg:col-span-2">
        <h2 class="ws-h2 mb-3">Run the bootstrap</h2>
        <p class="ws-subtle mb-6 max-w-2xl">
          Clicking the button submits a job to
          <code class="font-mono text-brand-700">admin_api</code>, which triggers the DAG in
          Airflow. The page polls for job status every 2 seconds and shows the outcome below.
        </p>

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
              Bootstrap Experiments
            }
          </button>

          @if (job()) {
            <button class="ws-btn-ghost" (click)="reset()">Clear result</button>
          }
          <div class="text-xs text-ink-500 flex-1 text-right">
            Idempotent — re-running is always safe.
          </div>
        </div>

        @if (errorMsg()) {
          <div class="mt-5 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-700">
            <div class="font-semibold mb-1">Couldn't submit the bootstrap</div>
            <div class="text-sm">{{ errorMsg() }}</div>
            <div class="text-xs text-ink-500 mt-2">
              Ensure admin_api is running:
              <code class="font-mono text-brand-700">npm run run:local:middleware:admin</code>
            </div>
          </div>
        }
      </div>

      <!-- Job status -->
      <div class="ws-card p-6 flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h2 class="ws-h2">Job status</h2>
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
                <path d="M4 17l5-5 4 4 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="text-sm text-ink-500 max-w-xs">
              Press <span class="font-semibold text-ink-700">Bootstrap Experiments</span>
              to start.
            </div>
          </div>
        } @else if (job(); as j) {
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

          @if (j.status === "succeeded") {
            <div class="mt-5 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div class="flex items-center gap-2 text-emerald-700 font-semibold">
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 10-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"/>
                </svg>
                All 8 experiments verified
              </div>
              <a href="http://localhost:5050" target="_blank"
                 class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900">
                Open in MLflow ↗
              </a>
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
      </div>
    </section>

    <!-- Experiment inventory -->
    <section class="ws-card p-6">
      <h2 class="ws-h2 mb-4">What this creates</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        @for (exp of experiments; track exp.name) {
          <div class="p-4 rounded-xl border border-surface-200 flex items-center gap-3
                      hover:border-brand-300 transition-colors duration-200">
            <div class="h-10 w-10 rounded-lg flex items-center justify-center text-white
                        text-xs font-bold shadow-soft shrink-0"
                 [style.background]="exp.gradient">
              {{ exp.kind === 'production' ? 'P' : 'M' }}
            </div>
            <div class="min-w-0">
              <div class="font-mono text-sm font-semibold text-ink-900 truncate">{{ exp.name }}</div>
              <div class="text-xs text-ink-500 truncate">{{ exp.description }}</div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class MlflowExperimentsComponent implements OnDestroy {
  private readonly admin = inject(AdminService);

  readonly submitting = signal<boolean>(false);
  readonly job = signal<JobResponse | null>(null);
  readonly errorMsg = signal<string | null>(null);

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  readonly experiments: ExperimentSlot[] = [
    {
      name: "wealth-form-classifier",
      kind: "production",
      gradient: "linear-gradient(135deg,#4F46E5,#06B6D4)",
      description: "Form-completion probability classifier (MLP + Focal Loss)",
    },
    {
      name: "wealth-segmentation",
      kind: "production",
      gradient: "linear-gradient(135deg,#06B6D4,#10B981)",
      description: "Customer-segmentation autoencoder + KMeans",
    },
    {
      name: "wealth-seq-model",
      kind: "production",
      gradient: "linear-gradient(135deg,#10B981,#F59E0B)",
      description: "Next-action LSTM (form-action sequence model)",
    },
    {
      name: "wealth-rl-policy",
      kind: "production",
      gradient: "linear-gradient(135deg,#F59E0B,#EC4899)",
      description: "Customer-R1 SFT+GRPO policy on Phi-3-mini",
    },
    {
      name: "mastery/wealth-form-classifier",
      kind: "mastery",
      gradient: "linear-gradient(135deg,#8B5CF6,#4F46E5)",
      description: "PyTorch-mastery learning runs · classifier",
    },
    {
      name: "mastery/wealth-segmentation",
      kind: "mastery",
      gradient: "linear-gradient(135deg,#8B5CF6,#4F46E5)",
      description: "PyTorch-mastery learning runs · segmentation",
    },
    {
      name: "mastery/wealth-seq-model",
      kind: "mastery",
      gradient: "linear-gradient(135deg,#8B5CF6,#4F46E5)",
      description: "PyTorch-mastery learning runs · sequence",
    },
    {
      name: "mastery/wealth-rl-policy",
      kind: "mastery",
      gradient: "linear-gradient(135deg,#8B5CF6,#4F46E5)",
      description: "PyTorch-mastery learning runs · RL policy",
    },
  ];

  isRunning(): boolean {
    const j = this.job();
    return j !== null && (j.status === "queued" || j.status === "running");
  }

  trigger(): void {
    this.errorMsg.set(null);
    this.submitting.set(true);
    this.admin.triggerMlflowBootstrap().subscribe({
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
