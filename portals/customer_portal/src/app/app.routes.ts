import { Routes } from "@angular/router";

export const APP_ROUTES: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./core/layout/shell.component").then((m) => m.ShellComponent),
    children: [
      {
        path: "",
        pathMatch: "full",
        loadComponent: () =>
          import("./features/landing/landing.component").then((m) => m.LandingComponent),
        title: "WealthSignal · Grow your wealth",
      },
      {
        path: "products",
        loadComponent: () =>
          import("./features/products/products.component").then((m) => m.ProductsComponent),
        title: "Browse wealth products",
      },
      {
        path: "apply/:sku",
        loadComponent: () =>
          import("./features/apply/apply.component").then((m) => m.ApplyComponent),
        title: "Start your application",
      },
    ],
  },
];
