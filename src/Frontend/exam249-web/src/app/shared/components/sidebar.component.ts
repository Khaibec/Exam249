import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="w-64 bg-slate-900 text-slate-300 flex flex-col h-[calc(100vh-4rem)] sticky top-16 border-r border-slate-800">
      <div class="flex-1 py-6 px-4 space-y-6 overflow-y-auto">
        
        <!-- Menu Label -->
        <div>
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Chức Năng Chính</h3>
          
          <nav class="space-y-1">
            <!-- ADMIN NAV -->
            <ng-container *ngIf="authService.isAdmin()">
              <a routerLink="/admin/dashboard" routerLinkActive="bg-brand-600 text-white font-semibold"
                 class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <i class="fa-solid fa-chart-pie w-6 text-center mr-2"></i>
                Tổng Quan Admin
              </a>
              <a routerLink="/admin/users" routerLinkActive="bg-brand-600 text-white font-semibold"
                 class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <i class="fa-solid fa-users-gear w-6 text-center mr-2"></i>
                Quản Lý Người Dùng
              </a>
              <a routerLink="/admin/subjects" routerLinkActive="bg-brand-600 text-white font-semibold"
                 class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <i class="fa-solid fa-book-bookmark w-6 text-center mr-2"></i>
                Quản Lý Môn Học
              </a>
            </ng-container>

            <!-- TEACHER NAV -->
            <ng-container *ngIf="authService.isTeacher()">
              <a routerLink="/teacher/dashboard" routerLinkActive="bg-brand-600 text-white font-semibold"
                 class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <i class="fa-solid fa-chart-line w-6 text-center mr-2"></i>
                Tổng Quan Lớp Học
              </a>
              <a routerLink="/teacher/classes" routerLinkActive="bg-brand-600 text-white font-semibold"
                 class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <i class="fa-solid fa-chalkboard w-6 text-center mr-2"></i>
                Quản Lý Lớp Học
              </a>
              <a routerLink="/teacher/questions" routerLinkActive="bg-brand-600 text-white font-semibold"
                 class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <i class="fa-solid fa-layer-group w-6 text-center mr-2"></i>
                Ngân Hàng Câu Hỏi
              </a>
              <a routerLink="/teacher/exams" routerLinkActive="bg-brand-600 text-white font-semibold"
                 class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <i class="fa-solid fa-file-pen w-6 text-center mr-2"></i>
                Tạo & Quản Lý Đề Thi
              </a>
            </ng-container>

            <!-- STUDENT NAV -->
            <ng-container *ngIf="authService.isStudent()">
              <a routerLink="/student/dashboard" routerLinkActive="bg-brand-600 text-white font-semibold"
                 class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <i class="fa-solid fa-house-chimney w-6 text-center mr-2"></i>
                Trang Chủ Học Sinh
              </a>
              <a routerLink="/student/classes" routerLinkActive="bg-brand-600 text-white font-semibold"
                 class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <i class="fa-solid fa-graduation-cap w-6 text-center mr-2"></i>
                Lớp Học Của Tôi
              </a>
              <a routerLink="/student/exams" routerLinkActive="bg-brand-600 text-white font-semibold"
                 class="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <i class="fa-solid fa-clock-rotate-left w-6 text-center mr-2"></i>
                Lịch Sử Bài Thi
              </a>
            </ng-container>
          </nav>
        </div>

      </div>

      <!-- Footer Anti-Cheat Status Badge -->
      <div class="p-4 border-t border-slate-800">
        <div class="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50">
          <div class="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Hệ thống Anti-Cheat Đang Bật</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1 leading-normal">
            Giám sát toàn màn hình, chuyển tab, phím tắt và sao chép dữ liệu thời gian thực.
          </p>
        </div>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  authService = inject(AuthService);
  UserRole = UserRole;
}
