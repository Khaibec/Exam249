import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          
          <!-- Logo & Brand -->
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <i class="fa-solid fa-graduation-cap text-lg"></i>
            </div>
            <div>
              <span class="text-xl font-extrabold text-slate-900 tracking-tight">Exam<span class="text-brand-600">249</span></span>
              <span class="hidden md:inline-block ml-2 px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Anti-Cheat v2.0</span>
            </div>
          </div>

          <!-- User Profile & Quick Action -->
          <div class="flex items-center space-x-4" *ngIf="authService.currentUser() as user">
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

            <!-- Logout Button -->
            <button (click)="authService.logout()"
                    class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Đăng xuất">
              <i class="fa-solid fa-arrow-right-from-bracket text-lg"></i>
            </button>
          </div>

        </div>
      </div>
    </header>
  `
})
export class NavbarComponent {
  authService = inject(AuthService);
  UserRole = UserRole;

  getRoleName(role: UserRole): string {
    switch (role) {
      case UserRole.Admin: return 'Quản Trị Viên';
      case UserRole.Teacher: return 'Giáo Viên';
      case UserRole.Student: return 'Học Sinh';
      default: return 'Người dùng';
    }
  }
}
