import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiResponse, ExamResult, QuestionType, StudentAnswerItem, StudentExamView, StudentQuestion, ViolationType } from '../../core/models/models';
import { AntiCheatService } from '../../core/services/anticheat.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-exam-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- MAIN EXAM ROOM CONTAINER (Fullscreen enforced, non-selectable) -->
    <div class="min-h-screen bg-slate-900 text-slate-100 exam-secure-mode flex flex-col justify-between select-none">
      
      <!-- TOP NAVIGATION BAR -->
      <header class="bg-slate-800/90 backdrop-blur-md border-b border-slate-700/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
        
        <!-- Left: Exam Title & Variant -->
        <div class="flex items-center space-x-3" *ngIf="examView() as view">
          <div class="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm">
            <i class="fa-solid fa-file-signature"></i>
          </div>
          <div>
            <h1 class="text-sm font-bold text-white tracking-wide truncate max-w-xs md:max-w-md">{{ view.examTitle }}</h1>
            <div class="flex items-center space-x-2 text-[11px] text-slate-400">
              <span>Mã đề: <strong class="text-brand-400 font-mono">{{ view.examVariantCode }}</strong></span>
              <span>•</span>
              <span>Lớp: {{ view.classroomName }}</span>
            </div>
          </div>
        </div>

        <!-- Center: COUNTDOWN TIMER & AUTOSAVE STATUS -->
        <div class="flex items-center space-x-4">
          <!-- Autosave status -->
          <div class="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400">
            <span class="w-2 h-2 rounded-full" [ngClass]="isAutosaving() ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'"></span>
            <span class="text-[11px]">{{ autosaveText() }}</span>
          </div>

          <!-- Timer Badge -->
          <div class="px-4 py-1.5 rounded-xl border font-mono font-black text-base flex items-center space-x-2 shadow-inner"
               [ngClass]="{
                 'bg-rose-500/10 border-rose-500/40 text-rose-400 animate-pulse': remainingSeconds() < 60,
                 'bg-amber-500/10 border-amber-500/40 text-amber-400': remainingSeconds() >= 60 && remainingSeconds() < 300,
                 'bg-slate-800 border-slate-700 text-white': remainingSeconds() >= 300
               }">
            <i class="fa-regular fa-clock text-sm"></i>
            <span>{{ formatTime(remainingSeconds()) }}</span>
          </div>
        </div>

        <!-- Right: Anti-Cheat Violations Badge & Submit Button -->
        <div class="flex items-center space-x-3">
          
          <!-- Anti-Cheat Status Badge -->
          <div class="hidden md:flex items-center space-x-2 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700 text-xs">
            <i class="fa-solid fa-shield-halved text-emerald-400"></i>
            <span class="text-slate-400">Vi phạm:</span>
            <span class="font-bold" [ngClass]="antiCheat.violationCount() > 0 ? 'text-rose-400' : 'text-emerald-400'">
              {{ antiCheat.violationCount() }}
            </span>
          </div>

          <!-- Submit Button -->
          <button (click)="openSubmitConfirmModal()"
                  class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center">
            <i class="fa-solid fa-paper-plane mr-2"></i>
            Nộp Bài Thi
          </button>
        </div>

      </header>

      <!-- EXAM BODY: QUESTIONS AREA + PALETTE SIDEBAR -->
      <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6" *ngIf="examView() as view">
        
        <!-- LEFT: QUESTION DISPLAY (Columns 1-3) -->
        <div class="lg:col-span-3 space-y-4 flex flex-col justify-between bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-700/60 p-6 shadow-xl">
          
          <div *ngIf="currentQuestion() as q">
            
            <!-- Question Header -->
            <div class="flex items-center justify-between pb-4 border-b border-slate-700">
              <div class="flex items-center space-x-2">
                <span class="px-3 py-1 bg-brand-600/20 border border-brand-500/40 text-brand-300 font-bold text-xs rounded-lg">
                  Câu hỏi {{ currentQuestionIndex() + 1 }} / {{ view.questions.length }}
                </span>
                <span class="px-2.5 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-md">
                  {{ getTypeLabel(q.type) }}
                </span>
                <span class="text-xs text-brand-400 font-semibold">({{ q.points }} điểm)</span>
              </div>

              <!-- Flag Button -->
              <button (click)="toggleFlag(q.questionId)"
                      class="px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors border"
                      [ngClass]="isFlagged(q.questionId) ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'">
                <i class="fa-solid fa-flag text-xs"></i>
                <span>{{ isFlagged(q.questionId) ? 'Đã đánh dấu xem lại' : 'Đánh dấu xem lại' }}</span>
              </button>
            </div>

            <!-- Question Content -->
            <div class="mt-6 text-base font-semibold text-white leading-relaxed">
              {{ q.content }}
            </div>

            <div *ngIf="q.imageUrl" class="mt-4 max-w-md">
              <img [src]="q.imageUrl" alt="Hình ảnh câu hỏi" class="rounded-xl border border-slate-700" />
            </div>

            <!-- Options Area (Single Choice) -->
            <div *ngIf="q.type === QuestionType.SingleChoice" class="mt-6 space-y-3">
              <div *ngFor="let opt of q.options; let optIdx = index"
                   (click)="selectSingleOption(q.questionId, opt.id)"
                   class="p-4 rounded-xl border text-sm flex items-center space-x-3 cursor-pointer transition-all"
                   [ngClass]="isSelected(q.questionId, opt.id) ? 'bg-brand-600/20 border-brand-500 text-white font-bold shadow-md shadow-brand-500/10' : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-700/50'">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border"
                     [ngClass]="isSelected(q.questionId, opt.id) ? 'bg-brand-500 border-brand-400 text-white' : 'border-slate-600 text-slate-400'">
                  {{ getOptionLetter(optIdx) }}
                </div>
                <span class="flex-1">{{ opt.content }}</span>
              </div>
            </div>

            <!-- Options Area (Multiple Choice) -->
            <div *ngIf="q.type === QuestionType.MultipleChoice" class="mt-6 space-y-3">
              <div *ngFor="let opt of q.options; let optIdx = index"
                   (click)="toggleMultiOption(q.questionId, opt.id)"
                   class="p-4 rounded-xl border text-sm flex items-center space-x-3 cursor-pointer transition-all"
                   [ngClass]="isSelected(q.questionId, opt.id) ? 'bg-brand-600/20 border-brand-500 text-white font-bold shadow-md shadow-brand-500/10' : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-700/50'">
                <div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border"
                     [ngClass]="isSelected(q.questionId, opt.id) ? 'bg-brand-500 border-brand-400 text-white' : 'border-slate-600 text-slate-400'">
                  <i *ngIf="isSelected(q.questionId, opt.id)" class="fa-solid fa-check"></i>
                  <span *ngIf="!isSelected(q.questionId, opt.id)">{{ getOptionLetter(optIdx) }}</span>
                </div>
                <span class="flex-1">{{ opt.content }}</span>
              </div>
            </div>

            <!-- Fill in the blank Input -->
            <div *ngIf="q.type === QuestionType.FillInTheBlank" class="mt-6 space-y-2">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nhập câu trả lời của bạn:</label>
              <input type="text" [ngModel]="getTextAnswer(q.questionId)" (ngModelChange)="onTextAnswerChange(q.questionId, $event)"
                     placeholder="Gõ đáp án chính xác..."
                     class="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-medium" />
              <p class="text-[11px] text-slate-400">Lưu ý: Hệ thống tự động chuẩn hóa khoảng trắng thừa và không phân biệt hoa thường.</p>
            </div>

          </div>

          <!-- Bottom Prev / Next Navigation -->
          <div class="mt-8 pt-4 border-t border-slate-700 flex items-center justify-between">
            <button (click)="prevQuestion()" [disabled]="currentQuestionIndex() === 0"
                    class="px-4 py-2 text-xs font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-xl disabled:opacity-30 transition-all flex items-center">
              <i class="fa-solid fa-chevron-left mr-2"></i>
              Câu Trước
            </button>

            <span class="text-xs text-slate-400">
              Đã làm: <strong class="text-emerald-400">{{ answeredCount() }}</strong> / {{ view.questions.length }} câu
            </span>

            <button (click)="nextQuestion()" [disabled]="currentQuestionIndex() === view.questions.length - 1"
                    class="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl disabled:opacity-30 transition-all flex items-center">
              <span>Câu Kế Tiếp</span>
              <i class="fa-solid fa-chevron-right ml-2"></i>
            </button>
          </div>

        </div>

        <!-- RIGHT: QUESTION PALETTE SIDEBAR (Column 4) -->
        <div class="bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-700/60 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-700">
              Bảng Câu Hỏi (Palette)
            </h3>

            <!-- Legend -->
            <div class="grid grid-cols-2 gap-2 my-4 text-[11px] text-slate-400">
              <div class="flex items-center space-x-1.5">
                <span class="w-3 h-3 rounded bg-brand-600"></span>
                <span>Đã làm</span>
              </div>
              <div class="flex items-center space-x-1.5">
                <span class="w-3 h-3 rounded bg-slate-700"></span>
                <span>Chưa làm</span>
              </div>
              <div class="flex items-center space-x-1.5">
                <span class="w-3 h-3 rounded bg-amber-500"></span>
                <span>Xem lại</span>
              </div>
              <div class="flex items-center space-x-1.5">
                <span class="w-3 h-3 rounded ring-2 ring-white bg-slate-700"></span>
                <span>Đang chọn</span>
              </div>
            </div>

            <!-- Numbers Grid -->
            <div class="grid grid-cols-5 gap-2 mt-2 max-h-72 overflow-y-auto pr-1">
              <button *ngFor="let q of view.questions; let i = index"
                      (click)="goToQuestion(i)"
                      class="h-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all relative"
                      [ngClass]="{
                        'ring-2 ring-white shadow-lg': currentQuestionIndex() === i,
                        'bg-amber-500 text-white': isFlagged(q.questionId),
                        'bg-brand-600 text-white': isAnswered(q.questionId) && !isFlagged(q.questionId),
                        'bg-slate-700 text-slate-300 hover:bg-slate-600': !isAnswered(q.questionId) && !isFlagged(q.questionId)
                      }">
                {{ i + 1 }}
                <span *ngIf="isFlagged(q.questionId)" class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-300"></span>
              </button>
            </div>
          </div>

          <!-- Bottom Proctoring Extension Hook Preview -->
          <div class="mt-6 pt-4 border-t border-slate-700">
            <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 text-center">
              <i class="fa-solid fa-camera text-slate-500 text-lg mb-1 block"></i>
              <span class="text-[11px] font-semibold text-slate-300 block">Proctoring Snapshot Hook</span>
              <span class="text-[10px] text-slate-500">Sẵn sàng tích hợp camera AI</span>
            </div>
          </div>

        </div>

      </main>

      <!-- PRE-EXAM RULES & FULLSCREEN AGREEMENT MODAL -->
      <div *ngIf="showRulesModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <div class="bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-700 text-slate-200">
          
          <div class="w-12 h-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center text-2xl mx-auto mb-4">
            <i class="fa-solid fa-shield-halved"></i>
          </div>

          <h3 class="text-xl font-bold text-white text-center">Quy Chế Phòng Thi Trực Tuyến & Chống Gian Lận</h3>
          <p class="text-xs text-slate-400 text-center mt-1">Hệ thống áp dụng cơ chế giám sát đa tầng tự động.</p>

          <div class="mt-5 space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-700/60 text-xs text-slate-300">
            <div class="flex items-start space-x-2">
              <i class="fa-solid fa-expand text-brand-400 mt-0.5"></i>
              <span><strong>Bắt buộc toàn màn hình:</strong> Bài thi yêu cầu chế độ Fullscreen trong suốt quá trình làm bài.</span>
            </div>
            <div class="flex items-start space-x-2">
              <i class="fa-solid fa-arrow-right-arrow-left text-amber-400 mt-0.5"></i>
              <span><strong>Không đổi tab:</strong> Hệ thống tự động ghi nhận và tính điểm vi phạm nếu bạn chuyển tab hoặc mất tiêu điểm.</span>
            </div>
            <div class="flex items-start space-x-2">
              <i class="fa-solid fa-ban text-rose-400 mt-0.5"></i>
              <span><strong>Vô hiệu hóa sao chép:</strong> Nghiêm cấm bôi đen, copy/paste và các phím tắt kiểm tra mã (F12, DevTools).</span>
            </div>
            <div class="flex items-start space-x-2">
              <i class="fa-solid fa-floppy-disk text-emerald-400 mt-0.5"></i>
              <span><strong>Tự động lưu:</strong> Bài làm của bạn được lưu ngầm liên tục và tự động nộp khi hết giờ.</span>
            </div>
          </div>

          <div class="mt-6 flex flex-col space-y-3">
            <button (click)="agreeAndEnterFullscreen()"
                    class="w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center">
              <i class="fa-solid fa-expand mr-2"></i>
              Tôi Đã Hiểu & Bắt Đầu Toàn Màn Hình
            </button>
            <button (click)="cancelExam()" class="text-xs text-slate-400 hover:text-white py-1">
              Quay lại trang chủ
            </button>
          </div>

        </div>
      </div>

      <!-- FULLSCREEN EXIT BLOCKING OVERLAY -->
      <div *ngIf="antiCheat.isOverlayWarningVisible()"
           class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/95 backdrop-blur-xl">
        <div class="max-w-md w-full text-center p-8 bg-slate-900 rounded-3xl border-2 border-rose-500 shadow-2xl shadow-rose-900/50">
          <div class="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          
          <h2 class="text-xl font-black text-white">CẢNH BÁO VI PHẠM QUY CHẾ THI</h2>
          <p class="text-xs text-rose-300 mt-2 leading-relaxed">
            {{ antiCheat.overlayWarningMessage() }}
          </p>

          <div class="mt-4 p-3 bg-slate-800 rounded-xl text-xs text-slate-400">
            Tổng số lần vi phạm đã ghi nhận: <strong class="text-rose-400 text-sm font-black">{{ antiCheat.violationCount() }}</strong> lần.
          </div>

          <button (click)="antiCheat.dismissOverlayWarning()"
                  class="mt-6 w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center">
            <i class="fa-solid fa-expand mr-2"></i>
            Quay Lại Chế Độ Toàn Màn Hình
          </button>
        </div>
      </div>

      <!-- CONFIRM SUBMIT MODAL -->
      <div *ngIf="showSubmitConfirm()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div class="bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-700 text-slate-200">
          <h3 class="text-lg font-bold text-white flex items-center">
            <i class="fa-solid fa-circle-question text-brand-400 mr-2"></i>
            Xác Nhận Nộp Bài Thi?
          </h3>

          <p class="text-xs text-slate-400 mt-2">
            Bạn đã hoàn thành <strong class="text-emerald-400">{{ answeredCount() }}</strong> trong tổng số
            <strong class="text-white">{{ examView()?.questions?.length }}</strong> câu hỏi.
          </p>

          <div *ngIf="answeredCount() < (examView()?.questions?.length || 0)"
               class="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start space-x-2">
            <i class="fa-solid fa-circle-exclamation mt-0.5 text-amber-400"></i>
            <span>Vẫn còn câu hỏi chưa được trả lời. Bạn có chắc chắn muốn nộp bài sớm không?</span>
          </div>

          <div class="mt-6 flex items-center justify-end space-x-3">
            <button (click)="showSubmitConfirm.set(false)"
                    class="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl">
              Tiếp tục làm bài
            </button>
            <button (click)="executeSubmit()"
                    class="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/30 transition-all">
              Xác Nhận Nộp Bài
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class ExamRoomComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  antiCheat = inject(AntiCheatService);
  private toast = inject(ToastService);

  QuestionType = QuestionType;

  examView = signal<StudentExamView | null>(null);
  currentQuestionIndex = signal<number>(0);
  answersMap = signal<Map<string, StudentAnswerItem>>(new Map());

  remainingSeconds = signal<number>(0);
  isAutosaving = signal<boolean>(false);
  autosaveText = signal<string>('Tự động lưu');

  showRulesModal = signal<boolean>(true);
  showSubmitConfirm = signal<boolean>(false);

  private timerInterval: any = null;
  private autosaveInterval: any = null;

  currentQuestion = computed<StudentQuestion | null>(() => {
    const view = this.examView();
    if (!view || !view.questions || view.questions.length === 0) return null;
    return view.questions[this.currentQuestionIndex()] || null;
  });

  answeredCount = computed<number>(() => {
    let count = 0;
    for (const [_, a] of this.answersMap()) {
      if ((a.selectedOptionIds && a.selectedOptionIds.length > 0) || (a.textAnswer && a.textAnswer.trim() !== '')) {
        count++;
      }
    }
    return count;
  });

  ngOnInit(): void {
    const examId = this.route.snapshot.paramMap.get('examId');
    if (!examId) {
      this.router.navigate(['/student/dashboard']);
      return;
    }

    this.startExamSession(examId);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
    clearInterval(this.autosaveInterval);
    this.antiCheat.stopMonitoring();
  }

  startExamSession(examId: string): void {
    this.http.post<ApiResponse<StudentExamView>>(`${environment.apiUrl}/exams/${examId}/start-session`, {}).subscribe({
      next: res => {
        if (res.success && res.data) {
          const data = res.data;
          this.examView.set(data);
          this.remainingSeconds.set(data.remainingSeconds);

          // Populate current answers
          const map = new Map<string, StudentAnswerItem>();
          data.questions.forEach(q => {
            map.set(q.questionId, { questionId: q.questionId, selectedOptionIds: [], textAnswer: '', isFlagged: false });
          });

          if (data.currentAnswers) {
            data.currentAnswers.forEach(a => {
              map.set(a.questionId, a);
            });
          }

          this.answersMap.set(map);
        }
      },
      error: err => {
        this.toast.error(err.error?.message || 'Không thể bắt đầu phiên thi.');
        this.router.navigate(['/student/dashboard']);
      }
    });
  }

  agreeAndEnterFullscreen(): void {
    this.showRulesModal.set(false);
    this.antiCheat.requestFullscreen().then(() => {
      const view = this.examView();
      if (view) {
        this.antiCheat.startMonitoring(view.sessionId);
        this.startTimer();
        this.startAutosaveLoop();
      }
    });
  }

  cancelExam(): void {
    this.router.navigate(['/student/dashboard']);
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.remainingSeconds.update(s => {
        if (s <= 1) {
          clearInterval(this.timerInterval);
          this.toast.warning('Đã hết giờ làm bài! Hệ thống đang tự động nộp bài...');
          this.executeSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  startAutosaveLoop(): void {
    this.autosaveInterval = setInterval(() => {
      this.saveAnswersRemotely();
    }, 15000); // Every 15 seconds
  }

  saveAnswersRemotely(): void {
    const view = this.examView();
    if (!view) return;

    this.isAutosaving.set(true);
    const answersList = Array.from(this.answersMap().values());

    this.http.post<ApiResponse>(`${environment.apiUrl}/exams/sessions/${view.sessionId}/autosave`, { answers: answersList }).subscribe({
      next: () => {
        this.isAutosaving.set(false);
        const timeStr = new Date().toLocaleTimeString('vi-VN');
        this.autosaveText.set(`Đã lưu lúc ${timeStr}`);
      },
      error: () => {
        this.isAutosaving.set(false);
        this.autosaveText.set('Lưu thất bại');
      }
    });
  }

  // Question navigation
  goToQuestion(index: number): void {
    this.currentQuestionIndex.set(index);
  }

  nextQuestion(): void {
    const view = this.examView();
    if (view && this.currentQuestionIndex() < view.questions.length - 1) {
      this.currentQuestionIndex.update(i => i + 1);
    }
  }

  prevQuestion(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update(i => i - 1);
    }
  }

  // Answer handlers
  selectSingleOption(questionId: string, optionId: string): void {
    const map = new Map(this.answersMap());
    const item = map.get(questionId) || { questionId, selectedOptionIds: [], isFlagged: false };
    item.selectedOptionIds = [optionId];
    map.set(questionId, item);
    this.answersMap.set(map);
  }

  toggleMultiOption(questionId: string, optionId: string): void {
    const map = new Map(this.answersMap());
    const item = map.get(questionId) || { questionId, selectedOptionIds: [], isFlagged: false };
    const idx = item.selectedOptionIds.indexOf(optionId);
    if (idx > -1) {
      item.selectedOptionIds.splice(idx, 1);
    } else {
      item.selectedOptionIds.push(optionId);
    }
    map.set(questionId, item);
    this.answersMap.set(map);
  }

  onTextAnswerChange(questionId: string, text: string): void {
    const map = new Map(this.answersMap());
    const item = map.get(questionId) || { questionId, selectedOptionIds: [], isFlagged: false };
    item.textAnswer = text;
    map.set(questionId, item);
    this.answersMap.set(map);
  }

  toggleFlag(questionId: string): void {
    const map = new Map(this.answersMap());
    const item = map.get(questionId) || { questionId, selectedOptionIds: [], isFlagged: false };
    item.isFlagged = !item.isFlagged;
    map.set(questionId, item);
    this.answersMap.set(map);
  }

  // Inspection helpers
  isSelected(questionId: string, optionId: string): boolean {
    const item = this.answersMap().get(questionId);
    return !!item && item.selectedOptionIds.includes(optionId);
  }

  getTextAnswer(questionId: string): string {
    return this.answersMap().get(questionId)?.textAnswer || '';
  }

  isFlagged(questionId: string): boolean {
    return !!this.answersMap().get(questionId)?.isFlagged;
  }

  isAnswered(questionId: string): boolean {
    const item = this.answersMap().get(questionId);
    if (!item) return false;
    return (item.selectedOptionIds && item.selectedOptionIds.length > 0) || (!!item.textAnswer && item.textAnswer.trim() !== '');
  }

  openSubmitConfirmModal(): void {
    this.showSubmitConfirm.set(true);
  }

  executeSubmit(): void {
    const view = this.examView();
    if (!view) return;

    this.showSubmitConfirm.set(false);
    const answersList = Array.from(this.answersMap().values());

    this.http.post<ApiResponse<ExamResult>>(`${environment.apiUrl}/exams/sessions/${view.sessionId}/submit`, { answers: answersList }).subscribe({
      next: res => {
        this.antiCheat.stopMonitoring();
        this.toast.success('Nộp bài thi thành công!');
        this.router.navigate(['/exam-result', view.sessionId]);
      },
      error: err => {
        this.toast.error(err.error?.message || 'Có lỗi xảy ra khi nộp bài.');
      }
    });
  }

  formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
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
