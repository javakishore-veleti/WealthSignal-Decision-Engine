import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

import { ApplicationDraft, ApplicationDraftIn } from "../models/product.model";

/** Typed client for customer_api (port 8002). */
@Injectable({ providedIn: "root" })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly base = "http://localhost:8002/api/v1";

  createDraft(payload: ApplicationDraftIn): Observable<ApplicationDraft> {
    return this.http.post<ApplicationDraft>(`${this.base}/applications/draft`, payload);
  }

  updateDraft(id: string, payload: ApplicationDraftIn): Observable<ApplicationDraft> {
    return this.http.put<ApplicationDraft>(
      `${this.base}/applications/draft/${encodeURIComponent(id)}`,
      payload,
    );
  }

  getDraft(id: string): Observable<ApplicationDraft> {
    return this.http.get<ApplicationDraft>(
      `${this.base}/applications/draft/${encodeURIComponent(id)}`,
    );
  }

  submit(id: string): Observable<unknown> {
    return this.http.post(`${this.base}/applications/${encodeURIComponent(id)}/submit`, {});
  }
}
