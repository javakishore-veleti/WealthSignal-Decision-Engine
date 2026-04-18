import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

/**
 * Customer-portal shell: top bar + footer. Consumer-facing, so the chrome
 * is lighter than the admin console — no side nav, generous whitespace.
 */
@Component({
  selector: "ws-shell",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col">
      <!-- Top bar -->
      <header class="sticky top-0 z-30 text-white shadow-[0_8px_32px_-16px_rgba(14,165,233,0.4)]"
              style="background: linear-gradient(120deg, #0EA5E9 0%, #06B6D4 45%, #10B981 100%);">
        <div class="max-w-[1400px] mx-auto flex items-center gap-2 px-6 py-4">
          <a routerLink="/" class="flex items-center gap-3 pr-6">
            <div class="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center
                        ring-1 ring-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6 text-white">
                <path d="M4 14.5L8 6l4 8.5L16 6l4 8.5" stroke="currentColor" stroke-width="2.4"
                      stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="20" cy="14.5" r="1.7" fill="currentColor"/>
              </svg>
            </div>
            <div class="leading-tight">
              <div class="font-display font-bold text-lg tracking-tight">WealthSignal</div>
              <div class="text-[11px] uppercase tracking-[0.18em] text-white/80">Grow your wealth</div>
            </div>
          </a>

          <nav class="flex items-center gap-1 ml-4">
            <a routerLink="/" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="active"
               class="ws-topnav-link">Home</a>
            <a routerLink="/products" routerLinkActive="active" class="ws-topnav-link">Explore</a>
            <a class="ws-topnav-link opacity-60 cursor-not-allowed">Insights</a>
            <a class="ws-topnav-link opacity-60 cursor-not-allowed">Help</a>
          </nav>

          <div class="flex-1"></div>

          <a class="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl
                    bg-white/10 hover:bg-white/20 transition-colors duration-200 text-sm font-semibold">
            Log in
          </a>
          <a routerLink="/products"
             class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-sky-700
                    font-semibold shadow-soft hover:shadow-glow transition-all duration-250">
            Get started
            <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
              <path fill-rule="evenodd" clip-rule="evenodd"
                d="M10.3 4.3a1 1 0 011.4 0l5 5a1 1 0 010 1.4l-5 5a1 1 0 01-1.4-1.4L13.6 11H4a1 1 0 110-2h9.6l-3.3-3.3a1 1 0 010-1.4z"/>
            </svg>
          </a>
        </div>
      </header>

      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>

      <footer class="mt-16 border-t border-surface-200 bg-white/60 backdrop-blur">
        <div class="max-w-[1400px] mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div class="col-span-2">
            <div class="flex items-center gap-3 mb-3">
              <div class="h-8 w-8 rounded-lg bg-horizon flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4 text-white">
                  <path d="M4 14.5L8 6l4 8.5L16 6l4 8.5" stroke="currentColor" stroke-width="2.4"
                        stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <span class="font-display font-bold">WealthSignal</span>
            </div>
            <p class="text-ink-500 max-w-sm leading-relaxed">
              Personalised wealth advice powered by the WealthSignal decision engine.
              Capital at risk. Regulated by the FCA.
            </p>
          </div>
          <div>
            <div class="font-semibold mb-2 text-ink-900">Products</div>
            <ul class="space-y-1.5 text-ink-500">
              <li>ISAs</li>
              <li>Pensions (SIPP)</li>
              <li>Investment accounts</li>
              <li>Funds &amp; ETFs</li>
            </ul>
          </div>
          <div>
            <div class="font-semibold mb-2 text-ink-900">Company</div>
            <ul class="space-y-1.5 text-ink-500">
              <li>About</li>
              <li>Careers</li>
              <li>Legal</li>
              <li>Privacy</li>
            </ul>
          </div>
        </div>
        <div class="border-t border-surface-200 py-4 text-center text-xs text-ink-500">
          © 2026 WealthSignal. All rights reserved.
        </div>
      </footer>
    </div>
  `,
})
export class ShellComponent {}
