import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiResponse, ExamResult, QuestionType, RiskLevel } from '../../core/models/models';

@Component({
  selector: 'app-exam-result',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-4xl mx-auto space-y-6 pb-12" *ngIf="result() as res">
      
      <!-- SCORE SUMMARY HERO CARD -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center p-8 relative">
        <div class="inline-flex w-16 h-16 rounded-2xl items-center justify-center text-3xl mb-4 shadow-lg"
             [ngClass]="res.isPassed ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-rose-500 text-white shadow-rose-500/30'">
          <i class="fa-solid" [ngClass]="res.isPassed ? 'fa-award' : 'fa-triangle-exclamation'"></i>
        </div>

        <h1 class="text-2xl font-black text-slate-900 tracking-tight">{{ res.examTitle }}</h1>
        <p class="text-xs text-slate-500 mt-1">Thí sinh: <strong>{{ res.studentName }}</strong> • Thời gian nộp: {{ res.submittedAtUtc | date:'HH:mm dd/MM/yyyy' }}</p>

        <!-- Score display -->
        <div class="mt-6 flex flex-col items-center">
          <div class="text-5xl font-black tracking-tight"
               [ngClass]="res.isPassed ? 'text-emerald-600' : 'text-rose-600'">
            {{ res.totalScore }} <span class="text-2xl font-bold text-slate-400">/ {{ res.maxScore }}</span>
          </div>
          <span class="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
            Tỷ lệ chính xác: {{ res.scorePercentage }}%
          </span>

          <span class="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mt-4"
                [ngClass]="res.isPassed ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'">
            <i class="fa-solid mr-1.5" [ngClass]="res.isPassed ? 'fa-check' : 'fa-xmark'"></i>
            {{ res.isPassed ? 'KẾT QUẢ: ĐẠT (PASSED)' : 'KẾT QUẢ: CHƯA ĐẠT (FAILED)' }}
          </span>
        </div>

        <!-- Metrics Grid -->
        <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span class="text-[11px] font-bold text-slate-400 uppercase block">Thời gian làm bài</span>
            <span class="text-sm font-black text-slate-800 mt-0.5">{{ formatDuration(res.durationSeconds) }}</span>
          </div>

          <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span class="text-[11px] font-bold text-slate-400 uppercase block">Chỉ số rủi ro (Risk)</span>
            <span class="text-sm font-black mt-0.5"
                  [ngClass]="{
                    'text-emerald-600': res.riskLevel === RiskLevel.Safe,
                    'text-amber-600': res.riskLevel === RiskLevel.Suspicious,
                    'text-rose-600': res.riskLevel === RiskLevel.HighRisk || res.riskLevel === RiskLevel.Critical
                  }">
              {{ res.riskScore }}đ - {{ getRiskLabel(res.riskLevel) }}
            </span>
          </div>

          <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span class="text-[11px] font-bold text-slate-400 uppercase block">Trạng thái chấm</span>
            <span class="text-sm font-black text-emerald-600 mt-0.5">Tự động 100%</span>
          </div>
        </div>

        <div class="mt-8 flex items-center justify-center space-x-3">
          <a routerLink="/student/dashboard"
             class="px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
            <i class="fa-solid fa-arrow-left mr-1.5"></i> Về Trang Chủ Học Sinh
          </a>
        </div>
      </div>

      <!-- QUESTIONS DETAILED REVIEW (If allowed) -->
      <div *ngIf="res.canReview && res.details && res.details.length > 0" class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-900">Chi Tiết Bài Làm & Đáp Án</h2>
          <span class="text-xs text-slate-500 font-medium">Đối chiếu câu trả lời của bạn với đáp án chính xác</span>
        </div>

        <div *ngFor="let d of res.details; let idx = index"
             class="bg-white rounded-2xl border p-5 shadow-sm space-y-3"
             [ngClass]="d.isCorrect ? 'border-emerald-200' : 'border-rose-200'">
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    [ngClass]="d.isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'">
                <i class="fa-solid" [ngClass]="d.isCorrect ? 'fa-check' : 'fa-xmark'"></i>
              </span>
              <span class="text-xs font-bold text-slate-700">Câu {{ idx + 1 }}</span>
              <span class="text-xs text-slate-400">({{ getTypeLabel(d.type) }})</span>
            </div>

            <span class="text-xs font-bold"
                  [ngClass]="d.isCorrect ? 'text-emerald-600' : 'text-rose-600'">
              +{{ d.pointsAwarded }} / {{ d.maxPoints }} điểm
            </span>
          </div>

          <h3 class="text-sm font-semibold text-slate-900 leading-relaxed">{{ d.questionContent }}</h3>

          <!-- Student's answer display -->
          <div class="p-3 rounded-xl text-xs space-y-1"
               [ngClass]="d.isCorrect ? 'bg-emerald-50/60 border border-emerald-100 text-emerald-900' : 'bg-rose-50/60 border border-rose-100 text-rose-900'">
            <div>
              <strong>Câu trả lời của bạn: </strong>
              <span *ngIf="d.type === QuestionType.FillInTheBlank">"{{ d.textAnswer || '(Bỏ trống)' }}"</span>
              <span *ngIf="d.type !== QuestionType.FillInTheBlank">
                {{ d.selectedOptionIds.length > 0 ? '(Đã chọn ' + d.selectedOptionIds.length + ' đáp án)' : '(Chưa chọn đáp án)' }}
              </span>
            </div>

            <!-- If incorrect, show correct answer -->
            <div *ngIf="!d.isCorrect && d.type === QuestionType.FillInTheBlank" class="text-emerald-700 font-semibold pt-1">
              <strong>Đáp án đúng: </strong> "{{ d.acceptedAnswers.join('", "') }}"
            </div>
          </div>

          <!-- Explanation -->
          <div *ngIf="d.explanation" class="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <strong class="text-slate-700"><i class="fa-solid fa-circle-info text-brand-500 mr-1"></i> Lời giải:</strong> {{ d.explanation }}
          </div>
        </div>
      </div>

    </div>
  `
})
export class ExamResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  QuestionType = QuestionType;
  RiskLevel = RiskLevel;

  result = signal<ExamResult | null>(null);

  ngOnInit(): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (!sessionId) return;

    this.http.get<ApiResponse<ExamResult>>(`${environment.apiUrl}/exams/sessions/${sessionId}/result`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.result.set(res.data);
        }
      }
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} giây`;
    return `${mins} phút ${secs} giây`;
  }

  getRiskLabel(level: RiskLevel): string {
    switch (level) {
      case RiskLevel.Safe: return 'An toàn';
      case RiskLevel.Suspicious: return 'Nghi vấn';
      case RiskLevel.HighRisk: return 'Rủi ro cao';
      case RiskLevel.Critical: return 'Nghiêm trọng';
      default: return 'Bình thường';
    }
  }

  getTypeLabel(type: QuestionType): string {
    switch (type) {
      case QuestionType.SingleChoice: return 'Trắc nghiệm 1 đáp án';
      case QuestionType.MultipleChoice: return 'Trắc nghiệm nhiều đáp án';
      case QuestionType.FillInTheBlank: return 'Điền đáp án';
      default: return '';
    }
  }
}
