import { Routes } from "@angular/router";

export const APP_ROUTES: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./core/layout/shell.component").then((m) => m.ShellComponent),
    children: [
      { path: "", pathMatch: "full", redirectTo: "dashboard" },

      {
        path: "dashboard",
        loadComponent: () =>
          import("./features/dashboard/dashboard.component").then(
            (m) => m.DashboardComponent,
          ),
        title: "Dashboard · WealthSignal Admin",
      },

      {
        path: "domain-services/product-catalog",
        children: [
          {
            path: "",
            pathMatch: "full",
            loadComponent: () =>
              import(
                "./features/product-catalog/product-list.component"
              ).then((m) => m.ProductListComponent),
            title: "Product Catalog · View All",
          },
          {
            path: "initial-load",
            loadComponent: () =>
              import(
                "./features/product-catalog/initial-load.component"
              ).then((m) => m.InitialLoadComponent),
            title: "Product Catalog · Initial Data Load",
          },
          {
            path: "create",
            loadComponent: () =>
              import(
                "./features/product-catalog/product-create.component"
              ).then((m) => m.ProductCreateComponent),
            title: "Product Catalog · Create",
          },
          {
            path: "search",
            loadComponent: () =>
              import(
                "./features/product-catalog/product-search.component"
              ).then((m) => m.ProductSearchComponent),
            title: "Product Catalog · Search",
          },
        ],
      },
    ],
  },
];
