import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiResponse, Classroom, ClassroomStudent, Subject } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-classroom-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Lớp Học</h1>
          <p class="text-sm text-slate-500 mt-1">Tạo lớp, cung cấp mã tham gia và quản trị danh sách học sinh phụ trách.</p>
        </div>
        <div class="mt-4 sm:mt-0">
          <button (click)="openCreateModal()"
                  class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all">
            <i class="fa-solid fa-plus mr-2"></i>
            Tạo Lớp Học Mới
          </button>
        </div>
      </div>

      <!-- Classrooms Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let c of classrooms()"
             class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between">
              <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                {{ c.subjectName }}
              </span>
              <span class="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200"
                    title="Mã tham gia cho học sinh">
                <i class="fa-solid fa-key text-slate-400 mr-1"></i> {{ c.code }}
              </span>
            </div>

            <h3 class="text-lg font-bold text-slate-900 mt-3">{{ c.name }}</h3>
            <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ c.description || 'Chưa có mô tả lớp học.' }}</p>

            <div class="flex items-center space-x-4 mt-4 text-xs text-slate-500 font-medium">
              <span><i class="fa-solid fa-user-group text-slate-400 mr-1"></i> {{ c.studentCount }} Học sinh</span>
              <span><i class="fa-solid fa-calendar text-slate-400 mr-1"></i> {{ c.createdAtUtc | date:'dd/MM/yyyy' }}</span>
            </div>
          </div>

          <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button (click)="viewStudents(c)"
                    class="text-xs font-bold text-brand-600 hover:text-brand-700">
              <i class="fa-solid fa-users mr-1"></i> Xem danh sách học sinh
            </button>
            <button (click)="copyCode(c.code)"
                    class="text-xs text-slate-400 hover:text-slate-600" title="Sao chép mã lớp">
              <i class="fa-regular fa-copy"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Create Classroom Modal -->
      <div *ngIf="showCreateModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 class="text-lg font-bold text-slate-900">Tạo Lớp Học Mới</h3>
            <button (click)="showCreateModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form (submit)="createClassroom()" class="space-y-4 mt-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tên Lớp Học</label>
              <input type="text" [(ngModel)]="newClassName" name="newClassName" required
                     placeholder="Ví dụ: 12A1 - Toán THPT 2026"
                     class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Môn Học</label>
              <select [(ngModel)]="newClassSubjectId" name="newClassSubjectId" required
                      class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                <option value="">-- Chọn Môn Học --</option>
                <option *ngFor="let s of subjects()" [value]="s.id">{{ s.name }} ({{ s.code }})</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mô Tả</label>
              <textarea [(ngModel)]="newClassDescription" name="newClassDescription" rows="3"
                        placeholder="Mô tả nội dung chương trình giảng dạy..."
                        class="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
            </div>

            <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" (click)="showCreateModal.set(false)"
                      class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                Hủy bỏ
              </button>
              <button type="submit"
                      class="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md">
                Tạo Lớp
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Students List Modal -->
      <div *ngIf="selectedClassroomForStudents() as c" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-bold text-slate-900">{{ c.name }}</h3>
              <p class="text-xs text-slate-500">Mã lớp: <strong class="text-brand-600">{{ c.code }}</strong></p>
            </div>
            <button (click)="selectedClassroomForStudents.set(null)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <div class="mt-4 max-h-80 overflow-y-auto">
            <div *ngIf="classroomStudents().length === 0" class="text-center py-8 text-slate-400 text-xs">
              Chưa có học sinh nào tham gia lớp này. Hãy gửi mã <strong>{{ c.code }}</strong> cho học sinh.
            </div>

            <div *ngFor="let s of classroomStudents()" class="flex items-center justify-between py-2.5 border-b border-slate-50">
              <div>
                <div class="text-sm font-bold text-slate-900">{{ s.studentName }}</div>
                <div class="text-xs text-slate-500">{{ s.studentEmail }}</div>
              </div>
              <span class="text-xs text-slate-400 font-medium">Tham gia: {{ s.joinedAtUtc | date:'dd/MM/yyyy' }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class ClassroomListComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  classrooms = signal<Classroom[]>([]);
  subjects = signal<Subject[]>([]);

  showCreateModal = signal(false);
  selectedClassroomForStudents = signal<Classroom | null>(null);
  classroomStudents = signal<ClassroomStudent[]>([]);

  newClassName = '';
  newClassSubjectId = '';
  newClassDescription = '';

  ngOnInit(): void {
    this.loadClassrooms();
    this.loadSubjects();
  }

  loadClassrooms(): void {
    this.http.get<ApiResponse<Classroom[]>>(`${environment.apiUrl}/classrooms`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.classrooms.set(res.data);
        }
      }
    });
  }

  loadSubjects(): void {
    this.http.get<ApiResponse<Subject[]>>(`${environment.apiUrl}/subjects`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.subjects.set(res.data);
        }
      }
    });
  }

  openCreateModal(): void {
    this.newClassName = '';
    this.newClassSubjectId = this.subjects().length > 0 ? this.subjects()[0].id : '';
    this.newClassDescription = '';
    this.showCreateModal.set(true);
  }

  createClassroom(): void {
    if (!this.newClassName || !this.newClassSubjectId) {
      this.toast.error('Vui lòng nhập tên lớp và chọn môn học.');
      return;
    }

    const payload = {
      name: this.newClassName,
      subjectId: this.newClassSubjectId,
      description: this.newClassDescription
    };

    this.http.post<ApiResponse<Classroom>>(`${environment.apiUrl}/classrooms`, payload).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.showCreateModal.set(false);
        this.loadClassrooms();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Không thể tạo lớp học.');
      }
    });
  }

  viewStudents(c: Classroom): void {
    this.selectedClassroomForStudents.set(c);
    this.http.get<ApiResponse<ClassroomStudent[]>>(`${environment.apiUrl}/classrooms/${c.id}/students`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.classroomStudents.set(res.data);
        }
      }
    });
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.toast.success(`Đã sao chép mã lớp: ${code}`);
    });
  }
}
