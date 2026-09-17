import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiResponse, TeacherDashboard } from '../../core/models/models';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Không Gian Giáo Viên</h1>
          <p class="text-sm text-slate-500 mt-1">Quản lý lớp học, ngân hàng đề thi và theo dõi kết quả làm bài của học sinh.</p>
        </div>
        <div class="mt-4 sm:mt-0 flex items-center space-x-3">
          <a routerLink="/teacher/exams"
             class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all">
            <i class="fa-solid fa-plus mr-2"></i>
            Tạo Đề Thi Mới
          </a>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" *ngIf="dashboard() as stats">
        
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-chalkboard"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Lớp Đang Dạy</span>
            <div class="text-2xl font-black text-slate-900 mt-0.5">{{ stats.totalClasses }}</div>
            <span class="text-xs text-slate-500 font-medium">Học kỳ hiện tại</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-user-graduate"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Số Học Sinh</span>
            <div class="text-2xl font-black text-slate-900 mt-0.5">{{ stats.totalStudents }}</div>
            <span class="text-xs text-slate-500 font-medium">Đã tham gia lớp</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-file-signature"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Kỳ Thi Đã Tạo</span>
            <div class="text-2xl font-black text-slate-900 mt-0.5">{{ stats.totalExams }}</div>
            <span class="text-xs text-slate-500 font-medium">{{ stats.totalSubmissions }} lượt nộp bài</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-chart-line"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ Lệ Đạt (Pass)</span>
            <div class="text-2xl font-black text-emerald-600 mt-0.5">{{ stats.overallPassRate }}%</div>
            <span class="text-xs text-slate-500 font-medium">Toàn bộ các kỳ thi</span>
          </div>
        </div>

      </div>

      <!-- Recent Exams with Anti-Cheat Risk Overview -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" *ngIf="dashboard() as stats">
        <div class="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Các Kỳ Thi Gần Đây & Đánh Giá Rủi Ro</h2>
            <p class="text-xs text-slate-500">Giám sát số lượng bài nộp, điểm trung bình và cảnh báo gian lận thi cử.</p>
          </div>
          <a routerLink="/teacher/exams" class="text-xs font-bold text-brand-600 hover:text-brand-700">
            Xem tất cả <i class="fa-solid fa-arrow-right ml-1"></i>
          </a>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th class="py-3.5 px-4">Tên Kỳ Thi</th>
                <th class="py-3.5 px-4">Lớp Học</th>
                <th class="py-3.5 px-4 text-center">Lượt Nộp</th>
                <th class="py-3.5 px-4 text-center">Điểm TB</th>
                <th class="py-3.5 px-4 text-center">Tỷ Lệ Đạt</th>
                <th class="py-3.5 px-4 text-center">Rủi Ro Gian Lận</th>
                <th class="py-3.5 px-4 text-right">Hạn Nộp</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr *ngFor="let ex of stats.recentExams" class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3.5 px-4 font-bold text-slate-900">{{ ex.title }}</td>
                <td class="py-3.5 px-4 text-slate-600">{{ ex.classroomName }}</td>
                <td class="py-3.5 px-4 text-center font-bold text-slate-700">{{ ex.submissionsCount }}</td>
                <td class="py-3.5 px-4 text-center font-bold text-brand-600">{{ ex.averageScore }}</td>
                <td class="py-3.5 px-4 text-center">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {{ ex.passRate }}%
                  </span>
                </td>
                <td class="py-3.5 px-4 text-center">
                  <span *ngIf="ex.highRiskCount === 0" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    <i class="fa-solid fa-shield-check text-emerald-500 mr-1.5"></i> An toàn
                  </span>
                  <span *ngIf="ex.highRiskCount > 0" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    <i class="fa-solid fa-triangle-exclamation text-rose-500 mr-1.5"></i> {{ ex.highRiskCount }} Nghi vấn
                  </span>
                </td>
                <td class="py-3.5 px-4 text-right text-xs text-slate-500">{{ ex.endTimeUtc | date:'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class TeacherDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  dashboard = signal<TeacherDashboard | null>(null);

  ngOnInit(): void {
    this.http.get<ApiResponse<TeacherDashboard>>(`${environment.apiUrl}/reporting/teacher/dashboard`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.dashboard.set(res.data);
        }
      }
    });
  }
}
