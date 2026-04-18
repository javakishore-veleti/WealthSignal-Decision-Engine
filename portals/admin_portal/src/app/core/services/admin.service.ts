import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

import { InitialLoadRequest, JobResponse } from "../models/product.model";

/**
 * Typed client for middleware/admin_api (port 8001).
 * Today exposes the Initial Data Load Setup trigger + job polling.
 */
@Injectable({ providedIn: "root" })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = "http://localhost:8001/api/v1";

  triggerInitialLoad(payload: InitialLoadRequest = { dry_run: false }): Observable<JobResponse> {
    return this.http.post<JobResponse>(
      `${this.base}/product-catalog/initial-load`,
      payload,
    );
  }

  pollJob(jobId: string): Observable<JobResponse> {
    return this.http.get<JobResponse>(`${this.base}/jobs/${encodeURIComponent(jobId)}`);
  }

  listJobs(): Observable<JobResponse[]> {
    return this.http.get<JobResponse[]>(`${this.base}/jobs`);
  }
}
