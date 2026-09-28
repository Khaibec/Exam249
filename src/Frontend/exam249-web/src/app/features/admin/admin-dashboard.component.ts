import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AdminDashboard, ApiResponse } from '../../core/models/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Bảng Điều Khiển Quản Trị Viên</h1>
          <p class="text-sm text-slate-500 mt-1">Giám sát tổng thể người dùng, phòng học, câu hỏi và đề thi trên toàn hệ thống Exam249.</p>
        </div>
        <div class="mt-4 sm:mt-0 flex items-center space-x-2">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span class="w-2 h-2 rounded-full bg-purple-500 mr-2 animate-pulse"></span>
            Super Admin Active
          </span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" *ngIf="dashboard() as stats">
        
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-users"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Người Dùng</span>
            <div class="text-2xl font-black text-slate-900 mt-0.5">{{ stats.totalUsers }}</div>
            <span class="text-xs text-slate-500 font-medium">{{ stats.totalTeachers }} Giáo viên • {{ stats.totalStudents }} Học sinh</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-chalkboard"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Lớp Học Hoạt Động</span>
            <div class="text-2xl font-black text-slate-900 mt-0.5">{{ stats.totalClassrooms }}</div>
            <span class="text-xs text-blue-600 font-medium">Toàn hệ thống</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-layer-group"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Ngân Hàng Câu Hỏi</span>
            <div class="text-2xl font-black text-slate-900 mt-0.5">{{ stats.totalQuestions }}</div>
            <span class="text-xs text-slate-500 font-medium">{{ stats.totalExams }} kỳ thi đã tạo</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-square-poll-vertical"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm TB Toàn Hệ Thống</span>
            <div class="text-2xl font-black text-emerald-600 mt-0.5">{{ stats.averageSystemScore }} / 10</div>
            <span class="text-xs text-slate-500 font-medium">{{ stats.totalSubmissions }} lượt thi đã nộp</span>
          </div>
        </div>

      </div>

      <!-- Quick Shortcuts Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <a routerLink="/admin/users"
           class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-brand-300 group flex items-start space-x-4">
          <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            <i class="fa-solid fa-users-gear"></i>
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">Quản Lý Người Dùng</h3>
              <i class="fa-solid fa-arrow-right text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all text-xs"></i>
            </div>
            <p class="text-xs text-slate-500 mt-1">Phân quyền, cấp tài khoản giáo viên/học sinh, khóa hoặc mở khóa tài khoản người dùng trong hệ thống.</p>
            <div class="mt-3 text-xs font-bold text-brand-600 flex items-center">
              <span>Xem danh sách tài khoản</span>
            </div>
          </div>
        </a>

        <a routerLink="/admin/subjects"
           class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-brand-300 group flex items-start space-x-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            <i class="fa-solid fa-book-bookmark"></i>
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">Quản Lý Môn Học</h3>
              <i class="fa-solid fa-arrow-right text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all text-xs"></i>
            </div>
            <p class="text-xs text-slate-500 mt-1">Cấu hình danh mục môn học, mã môn học chuẩn và mô tả để các giáo viên tạo lớp và ngân hàng câu hỏi.</p>
            <div class="mt-3 text-xs font-bold text-brand-600 flex items-center">
              <span>Xem danh mục môn học</span>
            </div>
          </div>
        </a>
      </div>

      <!-- System Architecture & Anti-Cheat Status -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        <!-- Left: Microservices Status -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Trạng Thái Cụm Dịch Vụ</h3>
          
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="font-bold text-slate-700">Identity Service</span>
              </div>
              <span class="text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded-full text-[10px]">Healthy</span>
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="font-bold text-slate-700">Classroom Service</span>
              </div>
              <span class="text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded-full text-[10px]">Healthy</span>
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="font-bold text-slate-700">Question Bank & Exam</span>
              </div>
              <span class="text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded-full text-[10px]">Healthy</span>
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="font-bold text-slate-700">Anti-Cheat Engine (SignalR)</span>
              </div>
              <span class="text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded-full text-[10px]">Healthy</span>
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="font-bold text-slate-700">Reporting & Analytics</span>
              </div>
              <span class="text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded-full text-[10px]">Healthy</span>
            </div>
          </div>
        </div>

        <!-- Right: Recent Activity Audit Logs -->
        <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Nhật Ký Hoạt Động Hệ Thống Gần Đây</h3>
              <span class="text-xs text-slate-400 font-medium">Tự động cập nhật</span>
            </div>

            <div class="space-y-3" *ngIf="dashboard()?.recentActivities?.length; else emptyActivities">
              <div *ngFor="let act of dashboard()?.recentActivities"
                   class="flex items-start space-x-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 text-xs">
                  <i class="fa-solid fa-clock-rotate-left"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-900 truncate">{{ act.title }}</span>
                    <span class="text-[11px] text-slate-400 whitespace-nowrap ml-2">{{ act.timestampUtc | date:'HH:mm dd/MM' }}</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5 line-clamp-1">{{ act.description }}</p>
                </div>
              </div>
            </div>

            <ng-template #emptyActivities>
              <div class="py-8 text-center text-xs text-slate-400">
                <i class="fa-regular fa-bell text-2xl text-slate-300 mb-2"></i>
                <p>Chưa có sự kiện nhật ký nào mới phát sinh trong 24 giờ qua.</p>
              </div>
            </ng-template>
          </div>

          <div class="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Anti-Cheat AI Analyzer: <strong class="text-emerald-600">Đang trực tuyến</strong></span>
            <span>Gateway: <strong class="text-slate-700">Yarp Reverse Proxy (Port 5000)</strong></span>
          </div>
        </div>

      </div>

    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);

  dashboard = signal<AdminDashboard | null>(null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.http.get<ApiResponse<AdminDashboard>>(`${environment.apiUrl}/reporting/admin/dashboard`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.dashboard.set(res.data);
        }
      }
    });
  }
}
