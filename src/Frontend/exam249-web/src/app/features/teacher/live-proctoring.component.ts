import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiResponse, Exam, LiveSessionMonitor, ProctoringSnapshot, RiskLevel, SessionStatus, ViolationEvent } from '../../core/models/models';
import { ProctoringSignalRService } from '../../core/services/proctoring-signalr.service';
import { ToastService } from '../../core/services/toast.service';
import { SecureImageComponent } from '../../shared/components/secure-image.component';

@Component({
  selector: 'app-live-proctoring',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SecureImageComponent],
  template: `
    <div class="space-y-6">
      <!-- Top Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div class="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <a routerLink="/teacher/exams" class="hover:text-brand-600 font-semibold flex items-center">
              <i class="fa-solid fa-arrow-left mr-1"></i> Quản Lý Đề Thi
            </a>
            <span>/</span>
            <span class="text-slate-700 font-bold">Giám Sát Thời Gian Thực</span>
          </div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">
            {{ exam()?.title || 'Phòng Thi Giám Sát Trực Tiếp' }}
          </h1>
          <p class="text-xs text-slate-500 mt-1" *ngIf="exam() as ex">
            Lớp: <strong>{{ ex.classroomName }}</strong> • Thời lượng: {{ ex.durationMinutes }} phút • Tổng câu hỏi: {{ ex.questionCount }}
          </p>
        </div>

        <div class="flex items-center space-x-3">
          <span class="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold border"
                [ngClass]="signalR.connectionState() === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'">
            <span class="w-2 h-2 rounded-full mr-2"
                  [ngClass]="signalR.connectionState() === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"></span>
            {{ signalR.connectionState() === 'connected' ? 'SignalR Đang Kết Nối' : 'Đang Kết Nối...' }}
          </span>

          <button (click)="refreshLiveSessions()"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
            <i class="fa-solid fa-rotate mr-1"></i> Làm mới
          </button>
        </div>
      </div>

      <!-- Summary Counters -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[11px] font-bold text-slate-400 uppercase">Đang Làm Bài</span>
          <div class="text-2xl font-black text-brand-600 mt-0.5">{{ activeCount() }}</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[11px] font-bold text-slate-400 uppercase">Đã Nộp Bài</span>
          <div class="text-2xl font-black text-emerald-600 mt-0.5">{{ submittedCount() }}</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[11px] font-bold text-slate-400 uppercase">Cảnh Báo Rủi Ro Cao</span>
          <div class="text-2xl font-black text-rose-600 mt-0.5">{{ highRiskCount() }}</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-[11px] font-bold text-slate-400 uppercase">Sự Kiện Vi Phạm Live</span>
          <div class="text-2xl font-black text-amber-600 mt-0.5">{{ signalR.liveAlerts().length }}</div>
        </div>
      </div>

      <!-- Main Grid: Candidates + Live Alert Stream -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <!-- Left (2 cols): Student Monitoring Cards -->
        <div class="xl:col-span-2 space-y-4">
          <div *ngIf="signalR.liveSessions().length === 0"
               class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <i class="fa-solid fa-desktop text-4xl text-slate-300 mb-3"></i>
            <p class="text-sm font-bold text-slate-700">Chưa có thí sinh nào đang trong phiên thi</p>
            <p class="text-xs text-slate-400 mt-1">Khi thí sinh vào phòng thi, thẻ giám sát kèm webcam và tiến độ làm bài sẽ tự động xuất hiện ở đây.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div *ngFor="let s of signalR.liveSessions()"
                 class="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col justify-between"
                 [ngClass]="{
                   'border-rose-300 ring-1 ring-rose-200': s.riskLevel >= RiskLevel.HighRisk,
                   'border-amber-300': s.riskLevel === RiskLevel.Suspicious,
                   'border-slate-200': s.riskLevel === RiskLevel.Safe
                 }">
              <div>
                <!-- Snapshot Thumbnail Header -->
                <div class="relative aspect-video bg-slate-900">
                  <app-secure-image *ngIf="s.latestSnapshotUrl"
                                    [src]="s.latestSnapshotUrl"
                                    [alt]="s.studentName"
                                    imgClass="w-full h-full object-cover"
                                    placeholderClass="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                  </app-secure-image>
                  <div *ngIf="!s.latestSnapshotUrl" class="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <i class="fa-solid fa-video-slash text-2xl mb-1"></i>
                    <span>{{ s.webcamActive ? 'Đang chờ ảnh đầu tiên...' : 'Chưa bật camera' }}</span>
                  </div>

                  <!-- Status Badge -->
                  <div class="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center shadow"
                          [ngClass]="{
                            'bg-emerald-600 text-white': s.status === SessionStatus.InProgress && s.isOnline,
                            'bg-amber-500 text-white': s.status === SessionStatus.InProgress && !s.isOnline,
                            'bg-blue-600 text-white': s.status === SessionStatus.Submitted,
                            'bg-rose-700 text-white': s.status === SessionStatus.Disqualified
                          }">
                      <span *ngIf="s.status === SessionStatus.InProgress && s.isOnline" class="w-1.5 h-1.5 rounded-full bg-white mr-1 animate-ping"></span>
                      {{ getStatusLabel(s) }}
                    </span>
                    <span class="px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-mono font-bold">
                      Mã {{ s.examVariantCode }}
                    </span>
                  </div>

                  <!-- Risk Score Pill -->
                  <div class="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-black shadow"
                       [ngClass]="{
                         'bg-emerald-500 text-white': s.riskLevel === RiskLevel.Safe,
                         'bg-amber-500 text-white': s.riskLevel === RiskLevel.Suspicious,
                         'bg-orange-600 text-white': s.riskLevel === RiskLevel.HighRisk,
                         'bg-rose-600 text-white': s.riskLevel === RiskLevel.Critical
                       }">
                    {{ s.totalRiskScore }}đ ({{ s.violationsCount }} lỗi)
                  </div>
                </div>

                <!-- Student Metadata & Progress -->
                <div class="p-4 space-y-3">
                  <div>
                    <h4 class="text-sm font-bold text-slate-900 truncate">{{ s.studentName }}</h4>
                    <p class="text-[11px] text-slate-500 truncate">{{ s.studentEmail || 'Thí sinh' }}</p>
                  </div>

                  <div>
                    <div class="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                      <span>Tiến độ làm bài</span>
                      <strong class="text-brand-600">{{ s.answeredCount }} / {{ s.totalQuestions || '?' }} câu</strong>
                    </div>
                    <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full bg-brand-600 transition-all duration-300"
                           [style.width.%]="s.totalQuestions > 0 ? (s.answeredCount / s.totalQuestions) * 100 : 0"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer Actions -->
              <div class="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button (click)="inspectSession(s)"
                        class="px-3 py-1.5 text-xs font-bold text-brand-600 bg-white border border-brand-200 hover:bg-brand-50 rounded-xl transition-colors">
                  <i class="fa-solid fa-magnifying-glass mr-1"></i> Nhật Ký & Ảnh
                </button>

                <button *ngIf="s.status === SessionStatus.InProgress"
                        (click)="openDisqualifyModal(s)"
                        class="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors">
                  <i class="fa-solid fa-ban mr-1"></i> Đình Chỉ Thi
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right (1 col): Live Alert Stream -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col max-h-[650px]">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900 flex items-center">
              <i class="fa-solid fa-bell text-rose-500 mr-2"></i>
              Cảnh Báo Vi Phạm Trực Tiếp
            </h3>
            <span class="text-[11px] font-bold text-slate-400">{{ signalR.liveAlerts().length }} sự kiện</span>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-2.5">
            <div *ngIf="signalR.liveAlerts().length === 0" class="text-center py-12 text-slate-400 text-xs">
              <i class="fa-solid fa-shield-check text-2xl text-emerald-400 mb-2 block"></i>
              Chưa có vi phạm mới nào được phát hiện.
            </div>

            <div *ngFor="let a of signalR.liveAlerts()"
                 class="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-rose-900">{{ a.studentName }}</span>
                <span class="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">
                  +{{ a.violation.penaltyPoints }}đ (Tổng {{ a.totalRiskScore }}đ)
                </span>
              </div>
              <div class="font-semibold text-rose-800">{{ a.violation.typeName }}</div>
              <div class="text-[11px] text-slate-600">{{ a.violation.description }}</div>
              <div class="text-[10px] text-slate-400 font-mono">
                {{ a.violation.timestampUtc | date:'HH:mm:ss dd/MM/yyyy' }}
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Inspect Session Modal (Violations + Webcam Snapshots) -->
      <div *ngIf="inspectedSession() as sess" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-900">Hồ Sơ Giám Sát: {{ sess.studentName }}</h3>
              <p class="text-xs text-slate-500">Điểm rủi ro: <strong>{{ sess.totalRiskScore }}đ</strong> • {{ sess.violationsCount }} vi phạm</p>
            </div>
            <button (click)="inspectedSession.set(null)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <div class="flex items-center space-x-2 mt-4 border-b border-slate-100 pb-2">
            <button (click)="inspectTab.set('violations')"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg"
                    [ngClass]="inspectTab() === 'violations' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'">
              Nhật Ký Vi Phạm ({{ sessionViolations().length }})
            </button>
            <button (click)="inspectTab.set('snapshots')"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg"
                    [ngClass]="inspectTab() === 'snapshots' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'">
              Ảnh Giám Sát Webcam ({{ sessionSnapshots().length }})
            </button>
          </div>

          <div class="flex-1 overflow-y-auto mt-4">
            <div *ngIf="inspectTab() === 'violations'" class="space-y-2.5">
              <div *ngIf="sessionViolations().length === 0" class="text-center py-8 text-emerald-600 text-xs font-semibold">
                Không có vi phạm nào được ghi nhận.
              </div>
              <div *ngFor="let v of sessionViolations()"
                   class="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-start space-x-3">
                <div class="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  +{{ v.penaltyPoints }}
                </div>
                <div class="flex-1">
                  <div class="text-xs font-bold text-rose-900">{{ v.typeName }}</div>
                  <div class="text-[11px] text-slate-600">{{ v.description }}</div>
                  <div class="text-[10px] text-slate-400 font-mono mt-1">{{ v.timestampUtc | date:'HH:mm:ss dd/MM/yyyy' }}</div>
                </div>
              </div>
            </div>

            <div *ngIf="inspectTab() === 'snapshots'">
              <div *ngIf="sessionSnapshots().length === 0" class="text-center py-8 text-slate-400 text-xs">
                Chưa có ảnh webcam nào được lưu cho phiên thi này.
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div *ngFor="let snap of sessionSnapshots()" class="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <div class="aspect-video bg-slate-900">
                    <app-secure-image [src]="snap.imageUrl" alt="Webcam snapshot"></app-secure-image>
                  </div>
                  <div class="p-2 text-[10px] text-slate-600 flex items-center justify-between">
                    <span class="font-bold">{{ snap.triggerReason }}</span>
                    <span class="font-mono">{{ snap.timestampUtc | date:'HH:mm:ss' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Disqualify Confirm Modal -->
      <div *ngIf="sessionToDisqualify() as target" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
          <h3 class="text-base font-bold text-rose-600 flex items-center">
            <i class="fa-solid fa-ban mr-2"></i>
            Đình Chỉ Phiên Thi Thí Sinh
          </h3>
          <p class="text-xs text-slate-600 mt-2">
            Bạn chuẩn bị buộc dừng bài thi của <strong>{{ target.studentName }}</strong>. Thí sinh sẽ bị khóa phòng thi ngay lập tức.
          </p>

          <div class="mt-4">
            <label class="block text-xs font-bold text-slate-700 mb-1">Lý do đình chỉ</label>
            <input type="text" [(ngModel)]="disqualifyReasonInput"
                   placeholder="Ví dụ: Phát hiện mở tài liệu / đổi tab liên tục"
                   class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>

          <div class="mt-6 flex items-center justify-end space-x-2">
            <button (click)="sessionToDisqualify.set(null)" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
              Hủy
            </button>
            <button (click)="confirmDisqualify()" class="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl">
              Xác Nhận Đình Chỉ
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class LiveProctoringComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  signalR = inject(ProctoringSignalRService);

  RiskLevel = RiskLevel;
  SessionStatus = SessionStatus;

  examId = '';
  exam = signal<Exam | null>(null);

  inspectedSession = signal<LiveSessionMonitor | null>(null);
  inspectTab = signal<'violations' | 'snapshots'>('violations');
  sessionViolations = signal<ViolationEvent[]>([]);
  sessionSnapshots = signal<ProctoringSnapshot[]>([]);

  sessionToDisqualify = signal<LiveSessionMonitor | null>(null);
  disqualifyReasonInput = 'Vi phạm quy chế phòng thi nghiêm trọng';

  activeCount = computed(() => this.signalR.liveSessions().filter(s => s.status === SessionStatus.InProgress).length);
  submittedCount = computed(() => this.signalR.liveSessions().filter(s => s.status === SessionStatus.Submitted).length);
  highRiskCount = computed(() => this.signalR.liveSessions().filter(s => s.riskLevel >= RiskLevel.HighRisk).length);

  ngOnInit(): void {
    this.examId = this.route.snapshot.paramMap.get('examId') || '';
    if (!this.examId) return;

    this.http.get<ApiResponse<Exam>>(`${environment.apiUrl}/exams/${this.examId}`).subscribe({
      next: res => {
        if (res.success && res.data) this.exam.set(res.data);
      }
    });

    this.signalR.connectProctor(this.examId);
  }

  ngOnDestroy(): void {
    this.signalR.disconnect();
  }

  refreshLiveSessions(): void {
    this.http.get<ApiResponse<LiveSessionMonitor[]>>(`${environment.apiUrl}/anticheat/exams/${this.examId}/live-sessions`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.signalR.liveSessions.set(res.data);
        }
      }
    });
  }

  inspectSession(s: LiveSessionMonitor): void {
    this.inspectedSession.set(s);
    this.inspectTab.set('violations');

    this.http.get<ApiResponse<ViolationEvent[]>>(`${environment.apiUrl}/anticheat/sessions/${s.sessionId}/violations`).subscribe({
      next: res => {
        if (res.success && res.data) this.sessionViolations.set(res.data);
      }
    });

    this.http.get<ApiResponse<ProctoringSnapshot[]>>(`${environment.apiUrl}/anticheat/sessions/${s.sessionId}/snapshots`).subscribe({
      next: res => {
        if (res.success && res.data) this.sessionSnapshots.set(res.data);
      }
    });
  }

  openDisqualifyModal(s: LiveSessionMonitor): void {
    this.disqualifyReasonInput = 'Vi phạm quy chế phòng thi nghiêm trọng';
    this.sessionToDisqualify.set(s);
  }

  confirmDisqualify(): void {
    const target = this.sessionToDisqualify();
    if (!target) return;

    this.http.post<ApiResponse>(`${environment.apiUrl}/exams/sessions/${target.sessionId}/disqualify`, {
      reason: this.disqualifyReasonInput
    }).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.sessionToDisqualify.set(null);
      },
      error: err => {
        this.toast.error(err.error?.message || 'Không thể đình chỉ phiên thi.');
      }
    });
  }

  getStatusLabel(s: LiveSessionMonitor): string {
    if (s.status === SessionStatus.Submitted) return 'Đã nộp bài';
    if (s.status === SessionStatus.Disqualified) return 'Đã đình chỉ';
    if (s.status === SessionStatus.TimedOut) return 'Hết giờ';
    return s.isOnline ? 'Đang thi (Online)' : 'Mất kết nối';
  }
}
