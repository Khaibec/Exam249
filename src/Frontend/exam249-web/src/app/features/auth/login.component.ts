import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserRole } from '../../core/models/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <!-- Background Ambient Glow -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div class="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 items-center justify-center text-white shadow-xl shadow-brand-500/30 mb-4">
          <i class="fa-solid fa-graduation-cap text-3xl"></i>
        </div>
        <h2 class="text-3xl font-extrabold text-white tracking-tight">Exam<span class="text-brand-400">249</span></h2>
        <p class="mt-2 text-sm text-slate-400 font-medium">Hệ Thống Thi Trực Tuyến & Chấm Điểm Tự Động Microservices</p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div class="bg-slate-800/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-700/80">
          
          <!-- Login Form -->
          <form (submit)="onSubmit()" class="space-y-5">
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Email Đăng Nhập</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i class="fa-solid fa-envelope"></i>
                </div>
                <input type="email" [(ngModel)]="email" name="email" required
                       class="block w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                       placeholder="example@exam249.com" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Mật Khẩu</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i class="fa-solid fa-lock"></i>
                </div>
                <input type="password" [(ngModel)]="password" name="password" required
                       class="block w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                       placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" [disabled]="isLoading()"
                    class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all">
              <i *ngIf="isLoading()" class="fa-solid fa-circle-notch fa-spin mr-2"></i>
              {{ isLoading() ? 'Đang xác thực...' : 'Đăng Nhập Hệ Thống' }}
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-700"></div>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-slate-800 px-3 text-slate-400 font-semibold">Đăng Nhập Nhanh (Tài Khoản Demo)</span>
            </div>
          </div>

          <!-- Quick Demo Buttons -->
          <div class="grid grid-cols-2 gap-2.5">
            <button type="button" (click)="quickLogin('admin@exam249.com', 'Admin@123456')"
                    class="flex items-center justify-center p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold transition-all">
              <i class="fa-solid fa-shield-halved mr-2 text-purple-400"></i>
              Admin Demo
            </button>

            <button type="button" (click)="quickLogin('teacher@exam249.com', 'Teacher@123456')"
                    class="flex items-center justify-center p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold transition-all">
              <i class="fa-solid fa-chalkboard-user mr-2 text-blue-400"></i>
              Giáo Viên Demo
            </button>

            <button type="button" (click)="quickLogin('student1@exam249.com', 'Student@123456')"
                    class="flex items-center justify-center p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition-all">
              <i class="fa-solid fa-user-graduate mr-2 text-emerald-400"></i>
              Học Sinh 1 Demo
            </button>

            <button type="button" (click)="quickLogin('student2@exam249.com', 'Student@123456')"
                    class="flex items-center justify-center p-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold transition-all">
              <i class="fa-solid fa-user-graduate mr-2 text-teal-400"></i>
              Học Sinh 2 Demo
            </button>
          </div>

        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  authService = inject(AuthService);
  toast = inject(ToastService);
  router = inject(Router);

  email = '';
  password = '';
  isLoading = signal(false);

  quickLogin(e: string, p: string): void {
    this.email = e;
    this.password = p;
    this.onSubmit();
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.toast.error('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    this.isLoading.set(true);
    this.authService.login(this.email, this.password).subscribe({
      next: res => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.toast.success(`Chào mừng ${res.data.user.fullName}!`);
          const role = res.data.user.role;
          if (role === UserRole.Admin) this.router.navigate(['/admin/dashboard']);
          else if (role === UserRole.Teacher) this.router.navigate(['/teacher/dashboard']);
          else this.router.navigate(['/student/dashboard']);
        }
      },
      error: err => {
        this.isLoading.set(false);
        const errorMsg = err.error?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại.';
        this.toast.error(errorMsg);
      }
    });
  }
}
