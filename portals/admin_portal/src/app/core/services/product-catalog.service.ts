import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

import {
  CategoriesResponse,
  Product,
  ProductListResponse,
} from "../models/product.model";

/**
 * Typed client for middleware/product_catalog_api (port 8004).
 * No request/response transformation — Pydantic schemas map 1:1 to the
 * TypeScript interfaces in product.model.ts.
 */
@Injectable({ providedIn: "root" })
export class ProductCatalogService {
  private readonly http = inject(HttpClient);
  private readonly base = "http://localhost:8004/api/v1";

  list(opts: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    activeOnly?: boolean;
  } = {}): Observable<ProductListResponse> {
    let params = new HttpParams()
      .set("page", String(opts.page ?? 1))
      .set("page_size", String(opts.pageSize ?? 20))
      .set("sort_by", opts.sortBy ?? "name")
      .set("sort_dir", opts.sortDir ?? "asc");
    if (opts.activeOnly !== undefined) {
      params = params.set("active_only", String(opts.activeOnly));
    }
    return this.http.get<ProductListResponse>(`${this.base}/products`, { params });
  }

  getBySku(sku: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/products/sku/${encodeURIComponent(sku)}`);
  }

  categories(): Observable<CategoriesResponse> {
    return this.http.get<CategoriesResponse>(`${this.base}/categories`);
  }
}
