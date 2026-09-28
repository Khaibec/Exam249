import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiResponse, Subject } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-subject-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Môn Học</h1>
          <p class="text-sm text-slate-500 mt-1">Danh mục môn học áp dụng cho toàn bộ lớp học, đề thi và ngân hàng câu hỏi.</p>
        </div>
        <div class="mt-4 sm:mt-0">
          <button (click)="openCreateModal()"
                  class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all">
            <i class="fa-solid fa-plus mr-2"></i>
            Thêm Môn Học Mới
          </button>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div class="relative flex-1 min-w-[240px] max-w-md">
          <input type="text" [(ngModel)]="searchKeyword" (input)="filterSubjects()"
                 placeholder="Tìm theo tên môn hoặc mã môn..."
                 class="w-full text-xs pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <i class="fa-solid fa-magnifying-glass text-slate-400 absolute left-2.5 top-3 text-xs"></i>
        </div>

        <div class="text-xs text-slate-500 font-semibold">
          Tổng cộng: <span class="text-brand-600 font-bold">{{ filteredSubjects().length }}</span> môn học
        </div>
      </div>

      <!-- Subjects Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div *ngFor="let s of filteredSubjects()"
             class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between">
              <span class="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                {{ s.code }}
              </span>
              <div class="flex items-center space-x-1">
                <button (click)="openEditModal(s)"
                        class="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                        title="Chỉnh sửa môn học">
                  <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button (click)="deleteSubject(s)"
                        class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors"
                        title="Xóa môn học">
                  <i class="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            </div>

            <h3 class="text-lg font-bold text-slate-900 mt-3">{{ s.name }}</h3>
            <p class="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
              {{ s.description || 'Chưa có thông tin mô tả chi tiết cho môn học này.' }}
            </p>
          </div>

          <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span class="flex items-center">
              <i class="fa-solid fa-book-open mr-1.5 text-slate-300"></i>
              Môn chính khóa
            </span>
            <span class="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Sẵn sàng giảng dạy
            </span>
          </div>
        </div>

        <div *ngIf="filteredSubjects().length === 0" class="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
          <i class="fa-solid fa-book-bookmark text-4xl text-slate-300 mb-3"></i>
          <p class="text-sm font-bold text-slate-700">Không tìm thấy môn học nào</p>
          <p class="text-xs text-slate-400 mt-1">Hãy thử tìm từ khóa khác hoặc tạo môn học mới.</p>
        </div>
      </div>

      <!-- Create / Edit Subject Modal -->
      <div *ngIf="showModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 class="text-lg font-bold text-slate-900">
              {{ isEditing() ? 'Chỉnh Sửa Môn Học' : 'Thêm Môn Học Mới' }}
            </h3>
            <button (click)="showModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form (submit)="saveSubject()" class="space-y-4 mt-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mã Môn Học</label>
              <input type="text" [(ngModel)]="currentCode" name="currentCode" required
                     [disabled]="isEditing()"
                     placeholder="Ví dụ: TOAN12, TINHOC, VATLY"
                     class="w-full text-sm font-mono uppercase px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-500" />
              <p *ngIf="isEditing()" class="text-[11px] text-slate-400 mt-1">Mã môn học không thể thay đổi sau khi tạo.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tên Môn Học</label>
              <input type="text" [(ngModel)]="currentName" name="currentName" required
                     placeholder="Ví dụ: Toán Học Lớp 12, Lập Trình .NET Core"
                     class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mô Tả Môn Học</label>
              <textarea [(ngModel)]="currentDescription" name="currentDescription" rows="3"
                        placeholder="Mô tả nội dung, đề cương sơ lược môn học..."
                        class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
            </div>

            <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" (click)="showModal.set(false)"
                      class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                Hủy bỏ
              </button>
              <button type="submit"
                      class="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md">
                {{ isEditing() ? 'Lưu Thay Đổi' : 'Tạo Môn Học' }}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
})
export class SubjectManagementComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  allSubjects = signal<Subject[]>([]);
  filteredSubjects = signal<Subject[]>([]);
  searchKeyword = '';

  showModal = signal(false);
  isEditing = signal(false);
  editingId: string | null = null;

  currentCode = '';
  currentName = '';
  currentDescription = '';

  ngOnInit(): void {
    this.loadSubjects();
  }

  loadSubjects(): void {
    this.http.get<ApiResponse<Subject[]>>(`${environment.apiUrl}/subjects`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.allSubjects.set(res.data);
          this.filterSubjects();
        }
      },
      error: () => this.toast.error('Không thể tải danh sách môn học.')
    });
  }

  filterSubjects(): void {
    const kw = this.searchKeyword.trim().toLowerCase();
    if (!kw) {
      this.filteredSubjects.set(this.allSubjects());
      return;
    }
    const filtered = this.allSubjects().filter(s =>
      s.name.toLowerCase().includes(kw) || s.code.toLowerCase().includes(kw)
    );
    this.filteredSubjects.set(filtered);
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId = null;
    this.currentCode = '';
    this.currentName = '';
    this.currentDescription = '';
    this.showModal.set(true);
  }

  openEditModal(subject: Subject): void {
    this.isEditing.set(true);
    this.editingId = subject.id;
    this.currentCode = subject.code;
    this.currentName = subject.name;
    this.currentDescription = subject.description || '';
    this.showModal.set(true);
  }

  saveSubject(): void {
    if (!this.currentName.trim()) {
      this.toast.error('Vui lòng nhập tên môn học.');
      return;
    }

    if (!this.isEditing() && !this.currentCode.trim()) {
      this.toast.error('Vui lòng nhập mã môn học.');
      return;
    }

    if (this.isEditing() && this.editingId) {
      const payload = {
        code: this.currentCode.trim().toUpperCase(),
        name: this.currentName.trim(),
        description: this.currentDescription.trim()
      };
      this.http.put<ApiResponse>(`${environment.apiUrl}/subjects/${this.editingId}`, payload).subscribe({
        next: res => {
          this.toast.success(res.message || 'Cập nhật môn học thành công!');
          this.showModal.set(false);
          this.loadSubjects();
        },
        error: err => this.toast.error(err.error?.message || 'Không thể cập nhật môn học.')
      });
    } else {
      const payload = {
        code: this.currentCode.trim().toUpperCase(),
        name: this.currentName.trim(),
        description: this.currentDescription.trim()
      };
      this.http.post<ApiResponse<Subject>>(`${environment.apiUrl}/subjects`, payload).subscribe({
        next: res => {
          this.toast.success(res.message || 'Tạo môn học thành công!');
          this.showModal.set(false);
          this.loadSubjects();
        },
        error: err => this.toast.error(err.error?.message || 'Không thể tạo môn học.')
      });
    }
  }

  deleteSubject(subject: Subject): void {
    if (!confirm(`Bạn có chắc chắn muốn xóa môn học "${subject.name}" (${subject.code})?`)) {
      return;
    }

    this.http.delete<ApiResponse>(`${environment.apiUrl}/subjects/${subject.id}`).subscribe({
      next: res => {
        this.toast.success(res.message || 'Xóa môn học thành công!');
        this.loadSubjects();
      },
      error: err => this.toast.error(err.error?.message || 'Không thể xóa môn học.')
    });
  }
}
