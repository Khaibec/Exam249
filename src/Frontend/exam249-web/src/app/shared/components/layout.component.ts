import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { SidebarComponent } from './sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-slate-50">
      <!-- Navbar -->
      <app-navbar></app-navbar>

      <!-- Content wrapper -->
      <div class="flex-1 flex">
        <!-- Sidebar -->
        <app-sidebar class="hidden md:block"></app-sidebar>

        <!-- Main Page Content -->
        <main class="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class LayoutComponent {}
