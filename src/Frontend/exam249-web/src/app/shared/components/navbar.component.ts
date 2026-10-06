import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          
          <!-- Logo & Brand with dynamic home link -->
          <a [routerLink]="getHomeRoute()" class="flex items-center space-x-3 cursor-pointer group">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <i class="fa-solid fa-graduation-cap text-lg"></i>
            </div>
            <div>
              <span class="text-xl font-extrabold text-slate-900 tracking-tight">Exam<span class="text-brand-600">249</span></span>
              <span class="hidden md:inline-block ml-2 px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Anti-Cheat v2.0</span>
            </div>
          </a>

          <!-- Right controls: User Profile & Mobile Toggle -->
          <div class="flex items-center space-x-3" *ngIf="authService.currentUser() as user">
            <!-- Role Badge -->
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                  [ngClass]="{
                    'bg-purple-100 text-purple-800 border border-purple-200': user.role === UserRole.Admin,
                    'bg-blue-100 text-blue-800 border border-blue-200': user.role === UserRole.Teacher,
                    'bg-emerald-100 text-emerald-800 border border-emerald-200': user.role === UserRole.Student
                  }">
              <i class="fa-solid mr-1.5"
                 [ngClass]="{
                   'fa-shield-halved': user.role === UserRole.Admin,
                   'fa-chalkboard-user': user.role === UserRole.Teacher,
                   'fa-user-graduate': user.role === UserRole.Student
                 }"></i>
              {{ getRoleName(user.role) }}
            </span>

            <!-- User Info -->
            <div class="hidden sm:flex flex-col text-right">
              <span class="text-sm font-bold text-slate-900 leading-tight">{{ user.fullName }}</span>
              <span class="text-xs text-slate-500">{{ user.email }}</span>
            </div>

            <!-- Mobile Menu Toggle Button (Visible only on mobile) -->
            <button (click)="isMobileMenuOpen.set(!isMobileMenuOpen())"
                    class="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Menu chức năng">
              <i class="fa-solid" [ngClass]="isMobileMenuOpen() ? 'fa-xmark text-lg' : 'fa-bars text-lg'"></i>
            </button>

            <!-- Logout Button -->
            <button (click)="authService.logout()"
                    class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Đăng xuất">
              <i class="fa-solid fa-arrow-right-from-bracket text-lg"></i>
            </button>
          </div>

        </div>
      </div>

      <!-- Mobile Navigation Drawer / Dropdown -->
      <div *ngIf="isMobileMenuOpen()" class="md:hidden border-t border-slate-200 bg-slate-900 text-slate-300 p-4 space-y-2">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Chức Năng Chính</h3>
        
        <!-- ADMIN MOBILE NAV -->
        <ng-container *ngIf="authService.isAdmin()">
          <a routerLink="/admin/dashboard" (click)="isMobileMenuOpen.set(false)"
             routerLinkActive="bg-brand-600 text-white font-semibold"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 transition-colors">
            <i class="fa-solid fa-chart-pie w-6 text-center mr-2"></i> Tổng Quan Admin
          </a>
          <a routerLink="/admin/users" (click)="isMobileMenuOpen.set(false)"
             routerLinkActive="bg-brand-600 text-white font-semibold"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 transition-colors">
            <i class="fa-solid fa-users-gear w-6 text-center mr-2"></i> Quản Lý Người Dùng
          </a>
          <a routerLink="/admin/subjects" (click)="isMobileMenuOpen.set(false)"
             routerLinkActive="bg-brand-600 text-white font-semibold"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 transition-colors">
            <i class="fa-solid fa-book-bookmark w-6 text-center mr-2"></i> Quản Lý Môn Học
          </a>
        </ng-container>

        <!-- TEACHER MOBILE NAV -->
        <ng-container *ngIf="authService.isTeacher()">
          <a routerLink="/teacher/dashboard" (click)="isMobileMenuOpen.set(false)"
             routerLinkActive="bg-brand-600 text-white font-semibold"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 transition-colors">
            <i class="fa-solid fa-chart-line w-6 text-center mr-2"></i> Tổng Quan Lớp Học
          </a>
          <a routerLink="/teacher/classes" (click)="isMobileMenuOpen.set(false)"
             routerLinkActive="bg-brand-600 text-white font-semibold"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 transition-colors">
            <i class="fa-solid fa-chalkboard w-6 text-center mr-2"></i> Quản Lý Lớp Học
          </a>
          <a routerLink="/teacher/questions" (click)="isMobileMenuOpen.set(false)"
             routerLinkActive="bg-brand-600 text-white font-semibold"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 transition-colors">
            <i class="fa-solid fa-layer-group w-6 text-center mr-2"></i> Ngân Hàng Câu Hỏi
          </a>
          <a routerLink="/teacher/exams" (click)="isMobileMenuOpen.set(false)"
             routerLinkActive="bg-brand-600 text-white font-semibold"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 transition-colors">
            <i class="fa-solid fa-file-pen w-6 text-center mr-2"></i> Tạo & Quản Lý Đề Thi
          </a>
        </ng-container>

        <!-- STUDENT MOBILE NAV -->
        <ng-container *ngIf="authService.isStudent()">
          <a routerLink="/student/dashboard" (click)="isMobileMenuOpen.set(false)"
             routerLinkActive="bg-brand-600 text-white font-semibold"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 transition-colors">
            <i class="fa-solid fa-house-chimney w-6 text-center mr-2"></i> Trang Chủ Học Sinh
          </a>
          <a routerLink="/student/classes" (click)="isMobileMenuOpen.set(false)"
             routerLinkActive="bg-brand-600 text-white font-semibold"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 transition-colors">
            <i class="fa-solid fa-graduation-cap w-6 text-center mr-2"></i> Lớp Học Của Tôi
          </a>
          <a routerLink="/student/exams" (click)="isMobileMenuOpen.set(false)"
             routerLinkActive="bg-brand-600 text-white font-semibold"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 transition-colors">
            <i class="fa-solid fa-clock-rotate-left w-6 text-center mr-2"></i> Lịch Sử Bài Thi
          </a>
        </ng-container>
      </div>
    </header>
  `
})
export class NavbarComponent {
  authService = inject(AuthService);
  UserRole = UserRole;
  isMobileMenuOpen = signal(false);

  getHomeRoute(): string {
    if (this.authService.isAdmin()) return '/admin/dashboard';
    if (this.authService.isTeacher()) return '/teacher/dashboard';
    return '/student/dashboard';
  }

  getRoleName(role: UserRole): string {
    switch (role) {
      case UserRole.Admin: return 'Quản Trị Viên';
      case UserRole.Teacher: return 'Giáo Viên';
      case UserRole.Student: return 'Học Sinh';
      default: return 'Người dùng';
    }
  }
}
