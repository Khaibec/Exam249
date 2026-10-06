import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiResponse, Exam, ExamStatus } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

interface MyExamHistoryItem {
  sessionId: string;
  examId: string;
  examTitle: string;
  subjectName: string;
  score: number;
  maxScore: number;
  isPassed: boolean;
  submittedAtUtc: string;
}

@Component({
  selector: 'app-student-exams',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Lịch Sử & Kỳ Thi Của Tôi</h1>
          <p class="text-sm text-slate-500 mt-1">Theo dõi các bài kiểm tra đã hoàn thành, điểm số và các kỳ thi đang mở để làm bài.</p>
        </div>
      </div>

      <!-- Tab Buttons -->
      <div class="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button (click)="activeTab.set('history')"
                class="px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-2"
                [ngClass]="activeTab() === 'history' ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' : 'text-slate-600 hover:bg-slate-100'">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <span>Lịch Sử Bài Thi Đã Nộp ({{ history().length }})</span>
        </button>
        <button (click)="activeTab.set('available')"
                class="px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-2"
                [ngClass]="activeTab() === 'available' ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' : 'text-slate-600 hover:bg-slate-100'">
          <i class="fa-solid fa-pen-to-square"></i>
          <span>Kỳ Thi Đang Mở ({{ availableExams().length }})</span>
        </button>
      </div>

      <!-- TAB 1: HISTORY -->
      <div *ngIf="activeTab() === 'history'" class="space-y-4">
        
        <!-- Summary Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" *ngIf="history().length > 0">
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <i class="fa-solid fa-file-lines"></i>
            </div>
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase">Tổng Lượt Thi</span>
              <div class="text-xl font-black text-slate-900">{{ history().length }} lượt</div>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <i class="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase">Đạt Điểm Chuẩn</span>
              <div class="text-xl font-black text-emerald-600">{{ passedCount() }} / {{ history().length }} bài</div>
            </div>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
              <i class="fa-solid fa-chart-line"></i>
            </div>
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase">Điểm Trung Bình</span>
              <div class="text-xl font-black text-brand-600">{{ averageScore() }} / 10</div>
            </div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div class="relative flex-1 min-w-[240px] max-w-md">
            <input type="text" [(ngModel)]="searchHistoryKeyword" (input)="filterHistory()"
                   placeholder="Tìm theo tên bài thi hoặc môn học..."
                   class="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <i class="fa-solid fa-magnifying-glass text-slate-400 absolute left-2.5 top-2.5 text-xs"></i>
          </div>

          <select [(ngModel)]="filterStatus" (change)="filterHistory()"
                  class="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
            <option value="all">Tất cả trạng thái</option>
            <option value="passed">Đã Đạt (Passed)</option>
            <option value="failed">Chưa Đạt (Failed)</option>
          </select>
        </div>

        <!-- History Table -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th class="py-3.5 px-4">Đề Thi</th>
                  <th class="py-3.5 px-4">Môn Học</th>
                  <th class="py-3.5 px-4 text-center">Điểm Đạt Được</th>
                  <th class="py-3.5 px-4 text-center">Kết Quả</th>
                  <th class="py-3.5 px-4">Ngày Nộp Bài</th>
                  <th class="py-3.5 px-4 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let item of filteredHistory()" class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4">
                    <span class="font-bold text-slate-900 block">{{ item.examTitle }}</span>
                    <span class="text-xs text-slate-400">Mã phiên: {{ (item.sessionId || '').slice(0, 8) }}...</span>
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      {{ item.subjectName }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    <span class="text-sm font-black" [ngClass]="item.isPassed ? 'text-emerald-600' : 'text-rose-600'">
                      {{ item.score }} / {{ item.maxScore }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          [ngClass]="item.isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">
                      <i class="fa-solid mr-1 text-[10px]" [ngClass]="item.isPassed ? 'fa-check' : 'fa-xmark'"></i>
                      {{ item.isPassed ? 'Đạt' : 'Chưa Đạt' }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-xs text-slate-500">
                    {{ item.submittedAtUtc | date:'HH:mm dd/MM/yyyy' }}
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <button (click)="viewResult(item.sessionId)"
                            class="px-3 py-1.5 text-xs font-bold text-brand-600 hover:text-white hover:bg-brand-600 border border-brand-200 hover:border-brand-600 rounded-xl transition-all">
                      Xem Điểm & Đáp Án
                    </button>
                  </td>
                </tr>

                <tr *ngIf="filteredHistory().length === 0">
                  <td colspan="6" class="py-12 text-center text-slate-400">
                    <i class="fa-solid fa-clipboard-question text-3xl mb-2 text-slate-300"></i>
                    <p class="font-bold text-slate-600">Chưa có lịch sử làm bài thi nào</p>
                    <p class="text-xs text-slate-400 mt-0.5">Các bài thi bạn hoàn thành sẽ được lưu trữ và thống kê chi tiết tại đây.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- TAB 2: AVAILABLE EXAMS -->
      <div *ngIf="activeTab() === 'available'" class="space-y-4">
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5" *ngIf="availableExams().length > 0; else emptyAvailable">
          <div *ngFor="let ex of availableExams()"
               class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                  {{ ex.classroomName || ex.subjectName }}
                </span>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> Đang mở thi
                </span>
              </div>

              <h3 class="text-lg font-bold text-slate-900 mt-3">{{ ex.title }}</h3>
              <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ ex.description || 'Bài kiểm tra học kỳ do giáo viên tạo.' }}</p>
              
              <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div><strong class="text-slate-900">Môn học:</strong> {{ ex.subjectName }}</div>
                <div><strong class="text-slate-900">Thời gian:</strong> {{ ex.durationMinutes }} phút</div>
                <div><strong class="text-slate-900">Điểm chuẩn:</strong> {{ ex.passingScore }} điểm</div>
                <div><strong class="text-slate-900">Hạn chót:</strong> {{ ex.endTimeUtc | date:'dd/MM/yyyy HH:mm' }}</div>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span class="text-xs text-slate-400 flex items-center">
                <i class="fa-solid fa-shield-halved text-brand-500 mr-1.5"></i>
                Chống gian lận AI
              </span>

              <button (click)="enterExam(ex.id)"
                      class="px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-500/25 transition-all flex items-center">
                <span>Vào Phòng Thi</span>
                <i class="fa-solid fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        </div>

        <ng-template #emptyAvailable>
          <div class="py-16 text-center bg-white rounded-2xl border border-slate-200">
            <i class="fa-solid fa-calendar-check text-4xl text-slate-300 mb-3"></i>
            <p class="text-sm font-bold text-slate-700">Hiện tại không có bài thi nào đang mở</p>
            <p class="text-xs text-slate-400 mt-1">Khi giáo viên phát đề thi mới cho lớp của bạn, đề sẽ tự động hiển thị ở đây.</p>
          </div>
        </ng-template>

      </div>

    </div>
  `
})
export class StudentExamsComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private router = inject(Router);

  activeTab = signal<'history' | 'available'>('history');

  history = signal<MyExamHistoryItem[]>([]);
  filteredHistory = signal<MyExamHistoryItem[]>([]);
  searchHistoryKeyword = '';
  filterStatus = 'all';

  availableExams = signal<Exam[]>([]);

  passedCount = signal(0);
  averageScore = signal(0);

  ngOnInit(): void {
    this.loadHistory();
    this.loadAvailableExams();
  }

  loadHistory(): void {
    this.http.get<ApiResponse<MyExamHistoryItem[]>>(`${environment.apiUrl}/exams/my-history`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.history.set(res.data);
          this.filterHistory();
          this.calculateStats(res.data);
        }
      },
      error: () => this.toast.error('Không thể tải lịch sử bài thi.')
    });
  }

  loadAvailableExams(): void {
    this.http.get<ApiResponse<Exam[]>>(`${environment.apiUrl}/exams`).subscribe({
      next: res => {
        if (res.success && res.data) {
          const now = new Date();
          // Filter exams that are published and within time window
          const openList = (res.data || []).filter(e => {
            const end = new Date(e.endTimeUtc);
            return e.status === ExamStatus.Published && end >= now;
          });
          this.availableExams.set(openList);
        }
      }
    });
  }

  calculateStats(items: MyExamHistoryItem[]): void {
    if (items.length === 0) {
      this.passedCount.set(0);
      this.averageScore.set(0);
      return;
    }
    const passed = items.filter(x => x.isPassed).length;
    this.passedCount.set(passed);

    const sum = items.reduce((acc, curr) => acc + curr.score, 0);
    const avg = Math.round((sum / items.length) * 10) / 10;
    this.averageScore.set(avg);
  }

  filterHistory(): void {
    const kw = this.searchHistoryKeyword.trim().toLowerCase();
    let result = this.history();

    if (kw) {
      result = result.filter(h =>
        h.examTitle.toLowerCase().includes(kw) ||
        h.subjectName.toLowerCase().includes(kw)
      );
    }

    if (this.filterStatus === 'passed') {
      result = result.filter(h => h.isPassed);
    } else if (this.filterStatus === 'failed') {
      result = result.filter(h => !h.isPassed);
    }

    this.filteredHistory.set(result);
  }

  viewResult(sessionId: string): void {
    this.router.navigate(['/exam-result', sessionId]);
  }

  enterExam(examId: string): void {
    this.router.navigate(['/exam-room', examId]);
  }
}
