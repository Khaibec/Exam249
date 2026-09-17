import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiResponse, Classroom, StudentDashboard } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Khu Vực Học Sinh</h1>
          <p class="text-sm text-slate-500 mt-1">Xem các bài thi được giao, tham gia lớp học và kiểm tra kết quả thi.</p>
        </div>
        <div class="mt-4 sm:mt-0">
          <button (click)="showJoinModal.set(true)"
                  class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all">
            <i class="fa-solid fa-plus mr-2"></i>
            Tham Gia Lớp Bằng Mã
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" *ngIf="dashboard() as stats">
        
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-chalkboard"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Lớp Đã Tham Gia</span>
            <div class="text-2xl font-black text-slate-900 mt-0.5">{{ stats.enrolledClassesCount }}</div>
            <span class="text-xs text-slate-500 font-medium">Đang theo học</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-clock"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Bài Thi Chờ Làm</span>
            <div class="text-2xl font-black text-amber-600 mt-0.5">{{ stats.pendingExamsCount }}</div>
            <span class="text-xs text-slate-500 font-medium">Cần hoàn thành</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-square-check"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Đã Hoàn Thành</span>
            <div class="text-2xl font-black text-slate-900 mt-0.5">{{ stats.completedExamsCount }}</div>
            <span class="text-xs text-slate-500 font-medium">Bài kiểm tra</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-trophy"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm Trung Bình</span>
            <div class="text-2xl font-black text-brand-600 mt-0.5">{{ stats.averageScore }} / 10</div>
            <span class="text-xs text-slate-500 font-medium">Học lực Giỏi</span>
          </div>
        </div>

      </div>

      <!-- Available Exams Section -->
      <div class="space-y-4" *ngIf="dashboard() as stats">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-900">Các Bài Thi Đang Mở Cho Bạn</h2>
          <span class="text-xs text-slate-500 font-medium">Bấm "Vào Phòng Thi" để bắt đầu làm bài</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div *ngFor="let ex of stats.upcomingExams"
               class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                  {{ ex.classroomName }}
                </span>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> Đang diễn ra
                </span>
              </div>

              <h3 class="text-lg font-bold text-slate-900 mt-3">{{ ex.title }}</h3>
              
              <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div><strong class="text-slate-900">Môn thi:</strong> {{ ex.subjectName }}</div>
                <div><strong class="text-slate-900">Thời gian:</strong> {{ ex.durationMinutes }} phút</div>
                <div><strong class="text-slate-900">Số lần còn lại:</strong> {{ ex.attemptsRemaining }} lần</div>
                <div><strong class="text-slate-900">Hạn nộp:</strong> {{ ex.endTimeUtc | date:'dd/MM/yyyy' }}</div>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span class="text-xs text-slate-400 flex items-center">
                <i class="fa-solid fa-shield-halved text-brand-500 mr-1.5"></i>
                Bật giám sát toàn màn hình
              </span>

              <button (click)="enterExam(ex.examId)"
                      class="px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-500/25 transition-all flex items-center">
                <span>Vào Phòng Thi</span>
                <i class="fa-solid fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Join Class Modal -->
      <div *ngIf="showJoinModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900">Tham Gia Lớp Học Mới</h3>
            <button (click)="showJoinModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form (submit)="joinClass()" class="space-y-4 mt-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nhập Mã Lớp</label>
              <input type="text" [(ngModel)]="classCodeToJoin" name="classCodeToJoin" required
                     placeholder="Ví dụ: THPT12A1 hoặc DOTNET01"
                     class="w-full text-sm font-mono uppercase px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-center tracking-wider font-bold" />
              <p class="text-[11px] text-slate-400 mt-1.5 text-center">Xin mã tham gia từ giáo viên phụ trách của bạn.</p>
            </div>

            <div class="flex items-center justify-end space-x-2 pt-2">
              <button type="button" (click)="showJoinModal.set(false)"
                      class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                Hủy bỏ
              </button>
              <button type="submit"
                      class="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md">
                Tham Gia Ngay
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
})
export class StudentDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private router = inject(Router);

  dashboard = signal<StudentDashboard | null>(null);
  showJoinModal = signal(false);
  classCodeToJoin = '';

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.http.get<ApiResponse<StudentDashboard>>(`${environment.apiUrl}/reporting/student/dashboard`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.dashboard.set(res.data);
        }
      }
    });
  }

  enterExam(examId: string): void {
    this.router.navigate(['/exam-room', examId]);
  }

  joinClass(): void {
    if (!this.classCodeToJoin.trim()) {
      this.toast.error('Vui lòng nhập mã lớp học.');
      return;
    }

    this.http.post<ApiResponse>(`${environment.apiUrl}/classrooms/join`, { code: this.classCodeToJoin.trim() }).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.showJoinModal.set(false);
        this.classCodeToJoin = '';
        this.loadDashboard();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Không thể tham gia lớp học. Vui lòng kiểm tra mã.');
      }
    });
  }
}
