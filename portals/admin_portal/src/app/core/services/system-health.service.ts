import { Injectable, OnDestroy, computed, inject, signal } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";

import {
  OverallStatus,
  ServiceHealth,
  SystemHealthResponse,
} from "../models/system-health.model";

const POLL_INTERVAL_MS = 20_000;

/**
 * Polls admin_api's aggregator every 20 s and exposes signals for
 * the top-bar badge + dropdown.
 *
 * If admin_api itself is unreachable, `overall` flips to 'unreachable'
 * and the UI shows a disconnected state. No blocking HTTP — polling is
 * best-effort and failures are swallowed after a log warning.
 */
@Injectable({ providedIn: "root" })
export class SystemHealthService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly base = "http://localhost:8001/api/v1/system";

  readonly response = signal<SystemHealthResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly lastCheckedAt = signal<Date | null>(null);

  /** 'healthy' | 'degraded' | 'unreachable' — unreachable when admin_api itself doesn't answer. */
  readonly overall = computed<OverallStatus>(() => {
    if (this.error()) return "unreachable";
    return this.response()?.overall ?? "unreachable";
  });

  readonly services = computed<ServiceHealth[]>(() => this.response()?.services ?? []);

  readonly downCount = computed<number>(
    () => this.response()?.summary.down ?? 0,
  );
  readonly degradedCount = computed<number>(
    () => this.response()?.summary.degraded ?? 0,
  );
  readonly issueCount = computed<number>(
    () => this.downCount() + this.degradedCount(),
  );

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.refresh();
    this.pollHandle = setInterval(() => this.refresh(), POLL_INTERVAL_MS);
  }

  refresh(): void {
    this.http.get<SystemHealthResponse>(`${this.base}/health`).subscribe({
      next: (res) => {
        this.response.set(res);
        this.error.set(null);
        this.lastCheckedAt.set(new Date());
      },
      error: (err: HttpErrorResponse) => {
        this.response.set(null);
        this.error.set(err.message || "admin_api unreachable");
        this.lastCheckedAt.set(new Date());
      },
    });
  }

  ngOnDestroy(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }
}
