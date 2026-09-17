import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiResponse, DifficultyLevel, PagedResult, Question, QuestionType, Subject } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Ngân Hàng Câu Hỏi</h1>
          <p class="text-sm text-slate-500 mt-1">Soạn thảo, phân loại và lưu trữ câu hỏi trắc nghiệm một/nhiều đáp án và điền từ.</p>
        </div>
        <div class="mt-4 sm:mt-0">
          <button (click)="openCreateModal()"
                  class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all">
            <i class="fa-solid fa-plus mr-2"></i>
            Soạn Câu Hỏi Mới
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[200px]">
          <input type="text" [(ngModel)]="searchKeyword" (keyup.enter)="loadQuestions()"
                 placeholder="Tìm kiếm nội dung câu hỏi..."
                 class="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <i class="fa-solid fa-magnifying-glass text-slate-400 absolute left-2.5 top-2.5 text-xs"></i>
        </div>

        <select [(ngModel)]="selectedType" (change)="loadQuestions()"
                class="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option [ngValue]="null">Tất cả loại câu hỏi</option>
          <option [ngValue]="QuestionType.SingleChoice">Trắc nghiệm 1 đáp án</option>
          <option [ngValue]="QuestionType.MultipleChoice">Trắc nghiệm nhiều đáp án</option>
          <option [ngValue]="QuestionType.FillInTheBlank">Điền đáp án</option>
        </select>

        <select [(ngModel)]="selectedDifficulty" (change)="loadQuestions()"
                class="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option [ngValue]="null">Tất cả độ khó</option>
          <option [ngValue]="DifficultyLevel.Easy">Dễ</option>
          <option [ngValue]="DifficultyLevel.Medium">Trung bình</option>
          <option [ngValue]="DifficultyLevel.Hard">Khó</option>
        </select>

        <button (click)="loadQuestions()"
                class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
          Lọc
        </button>
      </div>

      <!-- Questions List -->
      <div class="space-y-4">
        <div *ngFor="let q of questions(); let idx = index"
             class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors">
          
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-black text-slate-400">#{{ idx + 1 }}</span>
              <span class="px-2.5 py-0.5 text-xs font-bold rounded-full"
                    [ngClass]="{
                      'bg-blue-100 text-blue-800': q.type === QuestionType.SingleChoice,
                      'bg-purple-100 text-purple-800': q.type === QuestionType.MultipleChoice,
                      'bg-amber-100 text-amber-800': q.type === QuestionType.FillInTheBlank
                    }">
                {{ getTypeLabel(q.type) }}
              </span>
              <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
                Độ khó: {{ getDifficultyLabel(q.difficulty) }}
              </span>
              <span class="text-xs font-semibold text-brand-600">{{ q.defaultPoints }} Điểm</span>
            </div>

            <button (click)="deleteQuestion(q.id)" class="text-slate-400 hover:text-rose-600 text-xs" title="Xóa câu hỏi">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>

          <!-- Question Content -->
          <h3 class="text-sm font-bold text-slate-900 mt-3 leading-relaxed">{{ q.content }}</h3>

          <!-- Options View (For Single / Multi Choice) -->
          <div *ngIf="q.type !== QuestionType.FillInTheBlank" class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div *ngFor="let opt of q.options; let oIdx = index"
                 class="p-2.5 rounded-xl border text-xs flex items-center space-x-2"
                 [ngClass]="opt.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-700'">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    [ngClass]="opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'">
                {{ getOptionLetter(oIdx) }}
              </span>
              <span class="flex-1">{{ opt.content }}</span>
              <i *ngIf="opt.isCorrect" class="fa-solid fa-check text-emerald-600"></i>
            </div>
          </div>

          <!-- Accepted Answers View (For Fill In The Blank) -->
          <div *ngIf="q.type === QuestionType.FillInTheBlank" class="mt-3 bg-amber-50/60 border border-amber-200 rounded-xl p-3">
            <span class="text-xs font-bold text-amber-900 block mb-1">
              <i class="fa-solid fa-spell-check mr-1 text-amber-600"></i> Các đáp án chuẩn hóa được chấp nhận:
            </span>
            <div class="flex flex-wrap gap-1.5">
              <span *ngFor="let ans of q.acceptedAnswers" class="px-2 py-0.5 bg-white border border-amber-300 text-amber-900 text-xs font-mono font-bold rounded-lg">
                "{{ ans }}"
              </span>
            </div>
          </div>

          <!-- Explanation -->
          <div *ngIf="q.explanation" class="mt-3 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start space-x-2">
            <i class="fa-solid fa-circle-info text-brand-500 mt-0.5"></i>
            <span><strong class="text-slate-700">Giải thích:</strong> {{ q.explanation }}</span>
          </div>

        </div>
      </div>

      <!-- Create Question Modal -->
      <div *ngIf="showCreateModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 class="text-lg font-bold text-slate-900">Soạn Thảo Câu Hỏi Mới</h3>
            <button (click)="showCreateModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form (submit)="saveQuestion()" class="space-y-4 mt-4">
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Môn Học</label>
                <select [(ngModel)]="newSubjectId" name="newSubjectId" required
                        class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option *ngFor="let s of subjects()" [value]="s.id">{{ s.name }}</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Loại Câu Hỏi</label>
                <select [(ngModel)]="newType" name="newType" required
                        class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option [ngValue]="QuestionType.SingleChoice">Trắc nghiệm 1 đáp án</option>
                  <option [ngValue]="QuestionType.MultipleChoice">Trắc nghiệm nhiều đáp án</option>
                  <option [ngValue]="QuestionType.FillInTheBlank">Điền đáp án</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Độ Khó</label>
                <select [(ngModel)]="newDifficulty" name="newDifficulty" required
                        class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option [ngValue]="DifficultyLevel.Easy">Dễ</option>
                  <option [ngValue]="DifficultyLevel.Medium">Trung bình</option>
                  <option [ngValue]="DifficultyLevel.Hard">Khó</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nội Dung Câu Hỏi</label>
              <textarea [(ngModel)]="newContent" name="newContent" rows="3" required
                        placeholder="Nhập nội dung đề bài..."
                        class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
            </div>

            <!-- Single & Multiple Choice Options Editor -->
            <div *ngIf="newType !== QuestionType.FillInTheBlank" class="space-y-3 pt-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Danh Sách Lựa Chọn (Tích xanh đáp án đúng)</span>
                <button type="button" (click)="addOption()" class="text-xs font-bold text-brand-600 hover:text-brand-700">
                  <i class="fa-solid fa-plus mr-1"></i> Thêm lựa chọn
                </button>
              </div>

              <div *ngFor="let opt of newOptions; let i = index" class="flex items-center space-x-2">
                <!-- Checkbox / Radio for correct answer -->
                <button type="button" (click)="toggleCorrectOption(i)"
                        class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors"
                        [ngClass]="opt.isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'">
                  <i class="fa-solid fa-check"></i>
                </button>

                <span class="text-xs font-bold text-slate-500 w-4">{{ getOptionLetter(i) }}.</span>

                <input type="text" [(ngModel)]="opt.content" [name]="'opt_' + i" required
                       placeholder="Nội dung lựa chọn..."
                       class="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />

                <button type="button" (click)="removeOption(i)" *ngIf="newOptions.length > 2"
                        class="text-slate-400 hover:text-rose-500 p-2">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <!-- Fill In The Blank Accepted Answers Editor -->
            <div *ngIf="newType === QuestionType.FillInTheBlank" class="space-y-3 pt-2">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Các Đáp Án Hợp Lệ (Cách nhau bằng dấu phẩy)
              </label>
              <input type="text" [(ngModel)]="newAcceptedAnswersText" name="newAcceptedAnswersText" required
                     placeholder="Ví dụ: sealed, sealed class, lớp sealed"
                     class="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <p class="text-[11px] text-slate-500">Hệ thống sẽ tự động chuẩn hóa: loại bỏ khoảng trắng dư, không phân biệt hoa/thường và hỗ trợ đối chiếu không dấu.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Lời Giải Thích Chi Tiết (Tùy chọn)</label>
              <textarea [(ngModel)]="newExplanation" name="newExplanation" rows="2"
                        placeholder="Giải thích tại sao đáp án đúng..."
                        class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
            </div>

            <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" (click)="showCreateModal.set(false)"
                      class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                Hủy bỏ
              </button>
              <button type="submit"
                      class="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md">
                Lưu Câu Hỏi
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
})
export class QuestionBankComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  QuestionType = QuestionType;
  DifficultyLevel = DifficultyLevel;

  questions = signal<Question[]>([]);
  subjects = signal<Subject[]>([]);

  searchKeyword = '';
  selectedType: QuestionType | null = null;
  selectedDifficulty: DifficultyLevel | null = null;

  showCreateModal = signal(false);

  // Form State
  newSubjectId = '';
  newType: QuestionType = QuestionType.SingleChoice;
  newDifficulty: DifficultyLevel = DifficultyLevel.Medium;
  newContent = '';
  newExplanation = '';
  newAcceptedAnswersText = '';
  newOptions: { content: string; isCorrect: boolean }[] = [
    { content: '', isCorrect: true },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false }
  ];

  ngOnInit(): void {
    this.loadSubjects();
    this.loadQuestions();
  }

  loadSubjects(): void {
    this.http.get<ApiResponse<Subject[]>>(`${environment.apiUrl}/subjects`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.subjects.set(res.data);
          if (res.data.length > 0) this.newSubjectId = res.data[0].id;
        }
      }
    });
  }

  loadQuestions(): void {
    let url = `${environment.apiUrl}/questions?pageIndex=1&pageSize=50`;
    if (this.searchKeyword) url += `&keyword=${encodeURIComponent(this.searchKeyword)}`;
    if (this.selectedType) url += `&type=${this.selectedType}`;
    if (this.selectedDifficulty) url += `&difficulty=${this.selectedDifficulty}`;

    this.http.get<ApiResponse<PagedResult<Question>>>(url).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.questions.set(res.data.items);
        }
      }
    });
  }

  openCreateModal(): void {
    this.newContent = '';
    this.newExplanation = '';
    this.newAcceptedAnswersText = '';
    this.newType = QuestionType.SingleChoice;
    this.newDifficulty = DifficultyLevel.Medium;
    this.newOptions = [
      { content: '', isCorrect: true },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false }
    ];
    this.showCreateModal.set(true);
  }

  addOption(): void {
    this.newOptions.push({ content: '', isCorrect: false });
  }

  removeOption(index: number): void {
    this.newOptions.splice(index, 1);
  }

  toggleCorrectOption(index: number): void {
    if (this.newType === QuestionType.SingleChoice) {
      this.newOptions.forEach((o, i) => o.isCorrect = i === index);
    } else if (this.newType === QuestionType.MultipleChoice) {
      this.newOptions[index].isCorrect = !this.newOptions[index].isCorrect;
    }
  }

  saveQuestion(): void {
    if (!this.newContent.trim()) {
      this.toast.error('Vui lòng nhập nội dung câu hỏi.');
      return;
    }

    const payload: any = {
      subjectId: this.newSubjectId,
      content: this.newContent.trim(),
      type: this.newType,
      difficulty: this.newDifficulty,
      defaultPoints: 2.0,
      explanation: this.newExplanation.trim(),
      tags: []
    };

    if (this.newType === QuestionType.FillInTheBlank) {
      const answers = this.newAcceptedAnswersText
        .split(',')
        .map(a => a.trim())
        .filter(a => !!a);

      if (answers.length === 0) {
        this.toast.error('Vui lòng nhập ít nhất một đáp án hợp lệ cho câu hỏi điền từ.');
        return;
      }
      payload.acceptedAnswers = answers;
    } else {
      const validOptions = this.newOptions.filter(o => o.content.trim() !== '');
      if (validOptions.length < 2) {
        this.toast.error('Vui lòng nhập ít nhất 2 lựa chọn.');
        return;
      }
      if (!validOptions.some(o => o.isCorrect)) {
        this.toast.error('Vui lòng chọn ít nhất một đáp án đúng.');
        return;
      }
      payload.options = validOptions.map((o, idx) => ({
        content: o.content.trim(),
        isCorrect: o.isCorrect,
        orderIndex: idx + 1
      }));
    }

    this.http.post<ApiResponse<Question>>(`${environment.apiUrl}/questions`, payload).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.showCreateModal.set(false);
        this.loadQuestions();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Không thể lưu câu hỏi.');
      }
    });
  }

  deleteQuestion(id: string): void {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này không?')) return;

    this.http.delete<ApiResponse>(`${environment.apiUrl}/questions/${id}`).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.loadQuestions();
      },
      error: () => this.toast.error('Không thể xóa câu hỏi.')
    });
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D...
  }

  getTypeLabel(type: QuestionType): string {
    switch (type) {
      case QuestionType.SingleChoice: return 'Trắc nghiệm 1 đáp án';
      case QuestionType.MultipleChoice: return 'Nhiều đáp án';
      case QuestionType.FillInTheBlank: return 'Điền đáp án';
      default: return '';
    }
  }

  getDifficultyLabel(d: DifficultyLevel): string {
    switch (d) {
      case DifficultyLevel.Easy: return 'Dễ';
      case DifficultyLevel.Medium: return 'Trung bình';
      case DifficultyLevel.Hard: return 'Khó';
      default: return '';
    }
  }
}
