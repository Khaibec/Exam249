import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiResponse, Classroom, Exam, Question, RiskLevel, Subject, TeacherExamSubmissionItem, ViolationEvent } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-exam-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Đề Thi & Giám Sát Kết Quả</h1>
          <p class="text-sm text-slate-500 mt-1">Cấu hình thời gian, xáo trộn câu hỏi/đáp án và theo dõi mức độ rủi ro gian lận thi cử.</p>
        </div>
        <div class="mt-4 sm:mt-0">
          <button (click)="openCreateModal()"
                  class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all">
            <i class="fa-solid fa-plus mr-2"></i>
            Tạo Đề Thi Mới
          </button>
        </div>
      </div>

      <!-- Exams Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let ex of exams()"
             class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
          
          <div>
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                {{ ex.classroomName }}
              </span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span> Đang mở
              </span>
            </div>

            <h3 class="text-base font-bold text-slate-900 mt-3">{{ ex.title }}</h3>
            <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ ex.description }}</p>

            <!-- Exam Specs -->
            <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div><strong class="text-slate-900">Thời gian:</strong> {{ ex.durationMinutes }} phút</div>
              <div><strong class="text-slate-900">Điểm đạt:</strong> {{ ex.passingScore }} điểm</div>
              <div><strong class="text-slate-900">Số câu hỏi:</strong> {{ ex.questionCount }} câu</div>
              <div><strong class="text-slate-900">Số lần thi:</strong> Tối đa {{ ex.maxAttempts }} lần</div>
            </div>

            <div class="mt-3 flex flex-wrap gap-1.5">
              <span *ngIf="ex.shuffleQuestions" class="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 rounded-md">
                <i class="fa-solid fa-shuffle mr-1"></i> Trộn câu
              </span>
              <span *ngIf="ex.shuffleOptions" class="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 rounded-md">
                <i class="fa-solid fa-shuffle mr-1"></i> Trộn đáp án
              </span>
              <span *ngIf="ex.allowReview" class="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-md">
                <i class="fa-solid fa-eye mr-1"></i> Cho xem lại
              </span>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button (click)="viewSubmissions(ex)"
                    class="px-3 py-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors">
              <i class="fa-solid fa-clipboard-check mr-1"></i> Xem Bài Nộp & Giám Sát
            </button>
            <button (click)="deleteExam(ex.id)" class="text-slate-400 hover:text-rose-600 text-xs p-1" title="Xóa đề thi">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>

        </div>
      </div>

      <!-- Submissions Modal (with Anti-Cheat Risk Scores) -->
      <div *ngIf="selectedExamForSubmissions() as ex" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Danh Sách Bài Nộp - {{ ex.title }}</h3>
              <p class="text-xs text-slate-500">Giám sát điểm số và chỉ số rủi ro gian lận (Risk Score) của thí sinh.</p>
            </div>
            <button (click)="selectedExamForSubmissions.set(null)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto mt-4">
            <div *ngIf="submissions().length === 0" class="text-center py-12 text-slate-400 text-xs">
              Chưa có học sinh nào nộp bài thi này.
            </div>

            <table *ngIf="submissions().length > 0" class="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead class="bg-slate-50 font-bold uppercase text-slate-500">
                <tr>
                  <th class="py-3 px-3">Học Sinh</th>
                  <th class="py-3 px-3">Email</th>
                  <th class="py-3 px-3 text-center">Thời Gian Làm</th>
                  <th class="py-3 px-3 text-center">Điểm Số</th>
                  <th class="py-3 px-3 text-center">Kết Quả</th>
                  <th class="py-3 px-3 text-center">Rủi Ro Gian Lận</th>
                  <th class="py-3 px-3 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let sub of submissions()" class="hover:bg-slate-50/80">
                  <td class="py-3 px-3 font-bold text-slate-900">{{ sub.studentName }}</td>
                  <td class="py-3 px-3 text-slate-500">{{ sub.studentEmail }}</td>
                  <td class="py-3 px-3 text-center text-slate-600">{{ sub.durationSeconds }} giây</td>
                  <td class="py-3 px-3 text-center font-bold text-sm text-brand-600">
                    {{ sub.totalScore }} / {{ sub.maxScore }} ({{ sub.scorePercentage }}%)
                  </td>
                  <td class="py-3 px-3 text-center">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px]"
                          [ngClass]="sub.isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">
                      {{ sub.isPassed ? 'ĐẠT' : 'CHƯA ĐẠT' }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-center">
                    <button (click)="viewViolations(sub.sessionId)"
                            class="inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer border"
                            [ngClass]="{
                              'bg-emerald-50 text-emerald-700 border-emerald-200': sub.riskLevel === RiskLevel.Safe,
                              'bg-amber-50 text-amber-700 border-amber-200': sub.riskLevel === RiskLevel.Suspicious,
                              'bg-orange-50 text-orange-700 border-orange-200': sub.riskLevel === RiskLevel.HighRisk,
                              'bg-rose-50 text-rose-700 border-rose-200': sub.riskLevel === RiskLevel.Critical
                            }">
                      <i class="fa-solid mr-1.5"
                         [ngClass]="{
                           'fa-shield-check text-emerald-500': sub.riskLevel === RiskLevel.Safe,
                           'fa-triangle-exclamation text-amber-500': sub.riskLevel === RiskLevel.Suspicious,
                           'fa-skull text-rose-500': sub.riskLevel === RiskLevel.Critical || sub.riskLevel === RiskLevel.HighRisk
                         }"></i>
                      {{ sub.riskScore }}đ - {{ getRiskLevelLabel(sub.riskLevel) }}
                    </button>
                  </td>
                  <td class="py-3 px-3 text-right">
                    <button (click)="viewViolations(sub.sessionId)" class="text-brand-600 hover:text-brand-700 font-bold">
                      Nhật ký vi phạm
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>

      <!-- Violations Detail Modal -->
      <div *ngIf="selectedSessionViolations()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900 flex items-center">
              <i class="fa-solid fa-shield-virus text-rose-500 mr-2"></i>
              Nhật Ký Vi Phạm Anti-Cheat Của Phiên Thi
            </h3>
            <button (click)="selectedSessionViolations.set(null)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto mt-4 space-y-2.5">
            <div *ngIf="selectedSessionViolations()?.length === 0" class="text-center py-8 text-emerald-600 font-semibold text-xs">
              <i class="fa-solid fa-circle-check text-2xl block mb-2"></i>
              Phiên thi hoàn toàn trong sạch! Không phát hiện hành vi khả nghi.
            </div>

            <div *ngFor="let v of selectedSessionViolations()"
                 class="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-start space-x-3">
              <div class="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                +{{ v.penaltyPoints }}
              </div>
              <div class="flex-1">
                <div class="text-xs font-bold text-rose-900">{{ v.typeName }}</div>
                <div class="text-[11px] text-slate-600 mt-0.5">{{ v.description }}</div>
                <div class="text-[10px] text-slate-400 mt-1 font-mono">
                  Lúc: {{ v.timestampUtc | date:'HH:mm:ss dd/MM/yyyy' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Exam Modal -->
      <div *ngIf="showCreateModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 class="text-lg font-bold text-slate-900">Tạo Đề Thi Mới</h3>
            <button (click)="showCreateModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form (submit)="createExam()" class="space-y-4 mt-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tiêu Đề Kỳ Thi</label>
              <input type="text" [(ngModel)]="newTitle" name="newTitle" required
                     placeholder="Ví dụ: Kiểm tra 15 phút - Tin học cơ sở"
                     class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Môn Học</label>
                <select [(ngModel)]="newSubjectId" name="newSubjectId" required
                        class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option *ngFor="let s of subjects()" [value]="s.id">{{ s.name }}</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Lớp Học Phụ Trách</label>
                <select [(ngModel)]="newClassroomId" name="newClassroomId" required
                        class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option *ngFor="let c of classrooms()" [value]="c.id">{{ c.name }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Thời Lượng (Phút)</label>
                <input type="number" [(ngModel)]="newDuration" name="newDuration" min="1" required
                       class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Điểm Đạt (Pass)</label>
                <input type="number" [(ngModel)]="newPassingScore" name="newPassingScore" min="1" step="0.5" required
                       class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Số Lần Thi Tối Đa</label>
                <input type="number" [(ngModel)]="newMaxAttempts" name="newMaxAttempts" min="1" required
                       class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            <!-- Anti-Cheat & Exam Toggles -->
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span class="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Cấu Hình Bảo Mật & Đề Thi</span>
              
              <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" [(ngModel)]="newShuffleQuestions" name="newShuffleQuestions" class="rounded text-brand-600" />
                <span>Xáo trộn thứ tự câu hỏi ngẫu nhiên cho từng học sinh</span>
              </label>

              <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" [(ngModel)]="newShuffleOptions" name="newShuffleOptions" class="rounded text-brand-600" />
                <span>Xáo trộn thứ tự các đáp án (A, B, C, D) cho từng câu</span>
              </label>

              <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" [(ngModel)]="newAllowReview" name="newAllowReview" class="rounded text-brand-600" />
                <span>Cho phép học sinh xem lại đáp án và lời giải chi tiết sau khi nộp</span>
              </label>
            </div>

            <!-- Question Selection from Bank -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Chọn Câu Hỏi Từ Ngân Hàng (Đã chọn: {{ selectedQuestionIds.size }} câu)
                </span>
              </div>

              <div class="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div *ngFor="let q of availableQuestions()"
                     (click)="toggleQuestionSelection(q.id)"
                     class="p-2.5 flex items-start space-x-2 cursor-pointer hover:bg-slate-50 transition-colors"
                     [ngClass]="{'bg-brand-50/60': selectedQuestionIds.has(q.id)}">
                  <input type="checkbox" [checked]="selectedQuestionIds.has(q.id)" class="mt-0.5 rounded text-brand-600" />
                  <div class="flex-1 text-xs">
                    <span class="font-bold text-slate-900">{{ q.content }}</span>
                    <div class="text-[10px] text-slate-400 mt-0.5">{{ q.subjectName }} • {{ q.defaultPoints }} điểm</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" (click)="showCreateModal.set(false)"
                      class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                Hủy bỏ
              </button>
              <button type="submit"
                      class="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md">
                Phát Hành Đề Thi
              </button>
            </div>
          </form>

        </div>
      </div>

    </div>
  `
})
export class ExamManagerComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  RiskLevel = RiskLevel;

  exams = signal<Exam[]>([]);
  subjects = signal<Subject[]>([]);
  classrooms = signal<Classroom[]>([]);
  availableQuestions = signal<Question[]>([]);

  showCreateModal = signal(false);
  selectedExamForSubmissions = signal<Exam | null>(null);
  submissions = signal<TeacherExamSubmissionItem[]>([]);
  selectedSessionViolations = signal<ViolationEvent[] | null>(null);

  // Form State
  newTitle = '';
  newSubjectId = '';
  newClassroomId = '';
  newDuration = 15;
  newPassingScore = 5.0;
  newMaxAttempts = 3;
  newShuffleQuestions = true;
  newShuffleOptions = true;
  newAllowReview = true;
  selectedQuestionIds = new Set<string>();

  ngOnInit(): void {
    this.loadExams();
    this.loadMetadata();
  }

  loadExams(): void {
    this.http.get<ApiResponse<Exam[]>>(`${environment.apiUrl}/exams`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.exams.set(res.data);
        }
      }
    });
  }

  loadMetadata(): void {
    this.http.get<ApiResponse<Subject[]>>(`${environment.apiUrl}/subjects`).subscribe(res => {
      if (res.success && res.data) this.subjects.set(res.data);
    });

    this.http.get<ApiResponse<Classroom[]>>(`${environment.apiUrl}/classrooms`).subscribe(res => {
      if (res.success && res.data) this.classrooms.set(res.data);
    });

    this.http.get<ApiResponse<any>>(`${environment.apiUrl}/questions?pageIndex=1&pageSize=100`).subscribe(res => {
      if (res.success && res.data) this.availableQuestions.set(res.data.items);
    });
  }

  openCreateModal(): void {
    this.newTitle = '';
    this.newDuration = 15;
    this.newPassingScore = 5.0;
    this.newMaxAttempts = 3;
    this.newShuffleQuestions = true;
    this.newShuffleOptions = true;
    this.newAllowReview = true;
    this.selectedQuestionIds.clear();

    if (this.subjects().length > 0) this.newSubjectId = this.subjects()[0].id;
    if (this.classrooms().length > 0) this.newClassroomId = this.classrooms()[0].id;

    // Auto select first 5 questions
    this.availableQuestions().slice(0, 5).forEach(q => this.selectedQuestionIds.add(q.id));

    this.showCreateModal.set(true);
  }

  toggleQuestionSelection(id: string): void {
    if (this.selectedQuestionIds.has(id)) {
      this.selectedQuestionIds.delete(id);
    } else {
      this.selectedQuestionIds.add(id);
    }
  }

  createExam(): void {
    if (!this.newTitle || !this.newSubjectId || !this.newClassroomId) {
      this.toast.error('Vui lòng điền đầy đủ tiêu đề, môn và lớp học.');
      return;
    }

    if (this.selectedQuestionIds.size === 0) {
      this.toast.error('Vui lòng chọn ít nhất một câu hỏi cho đề thi.');
      return;
    }

    const payload = {
      title: this.newTitle.trim(),
      description: `Đề thi thời lượng ${this.newDuration} phút gồm ${this.selectedQuestionIds.size} câu hỏi.`,
      subjectId: this.newSubjectId,
      classroomId: this.newClassroomId,
      startTimeUtc: new Date(Date.now() - 3600000).toISOString(),
      endTimeUtc: new Date(Date.now() + 30 * 86400000).toISOString(),
      durationMinutes: this.newDuration,
      passingScore: this.newPassingScore,
      maxAttempts: this.newMaxAttempts,
      shuffleQuestions: this.newShuffleQuestions,
      shuffleOptions: this.newShuffleOptions,
      showResultsImmediately: true,
      allowReview: this.newAllowReview,
      questions: Array.from(this.selectedQuestionIds).map((qid, idx) => ({
        questionId: qid,
        points: 2.0,
        orderIndex: idx + 1
      }))
    };

    this.http.post<ApiResponse<Exam>>(`${environment.apiUrl}/exams`, payload).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.showCreateModal.set(false);
        this.loadExams();
      },
      error: err => this.toast.error(err.error?.message || 'Không thể tạo đề thi.')
    });
  }

  viewSubmissions(ex: Exam): void {
    this.selectedExamForSubmissions.set(ex);
    this.http.get<ApiResponse<TeacherExamSubmissionItem[]>>(`${environment.apiUrl}/exams/${ex.id}/submissions`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.submissions.set(res.data);
        }
      }
    });
  }

  viewViolations(sessionId: string): void {
    this.http.get<ApiResponse<ViolationEvent[]>>(`${environment.apiUrl}/anticheat/sessions/${sessionId}/violations`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.selectedSessionViolations.set(res.data);
        }
      }
    });
  }

  deleteExam(id: string): void {
    if (!confirm('Bạn có chắc muốn xóa đề thi này không?')) return;
    this.http.delete<ApiResponse>(`${environment.apiUrl}/exams/${id}`).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.loadExams();
      }
    });
  }

  getRiskLevelLabel(r: RiskLevel): string {
    switch (r) {
      case RiskLevel.Safe: return 'An toàn';
      case RiskLevel.Suspicious: return 'Nghi vấn';
      case RiskLevel.HighRisk: return 'Rủi ro cao';
      case RiskLevel.Critical: return 'Nghiêm trọng';
      default: return 'Bình thường';
    }
  }
}
