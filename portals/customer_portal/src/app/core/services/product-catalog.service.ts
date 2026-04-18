import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

import {
  CriteriaSearchRequest,
  NlpSearchRequest,
  NlpSearchResponse,
  Product,
  ProductListResponse,
} from "../models/product.model";

/** Typed client for product_catalog_api (port 8004). */
@Injectable({ providedIn: "root" })
export class ProductCatalogService {
  private readonly http = inject(HttpClient);
  private readonly base = "http://localhost:8004/api/v1";

  list(page = 1, pageSize = 12): Observable<ProductListResponse> {
    const params = new HttpParams()
      .set("page", String(page))
      .set("page_size", String(pageSize))
      .set("sort_by", "aum")
      .set("sort_dir", "desc");
    return this.http.get<ProductListResponse>(`${this.base}/products`, { params });
  }

  getBySku(sku: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/products/sku/${encodeURIComponent(sku)}`);
  }

  searchNlp(req: NlpSearchRequest): Observable<NlpSearchResponse> {
    return this.http.post<NlpSearchResponse>(
      `${this.base}/products/search/nlp`,
      { top_k: 24, ...req },
    );
  }

  searchCriteria(req: CriteriaSearchRequest, page = 1): Observable<ProductListResponse> {
    const params = new HttpParams().set("page", String(page)).set("page_size", "24");
    return this.http.post<ProductListResponse>(
      `${this.base}/products/search/criteria`,
      req,
      { params },
    );
  }
}
