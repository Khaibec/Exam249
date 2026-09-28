import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiResponse, Classroom, ClassroomStudent } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-student-classes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Lớp Học Của Tôi</h1>
          <p class="text-sm text-slate-500 mt-1">Danh sách tất cả các lớp học bạn đã tham gia và thông tin giáo viên phụ trách.</p>
        </div>
        <div class="mt-4 sm:mt-0">
          <button (click)="showJoinModal.set(true)"
                  class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all">
            <i class="fa-solid fa-plus mr-2"></i>
            Tham Gia Lớp Bằng Mã
          </button>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div class="relative flex-1 min-w-[240px] max-w-md">
          <input type="text" [(ngModel)]="searchKeyword" (input)="filterClasses()"
                 placeholder="Tìm theo tên lớp, môn học hoặc giáo viên..."
                 class="w-full text-xs pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <i class="fa-solid fa-magnifying-glass text-slate-400 absolute left-2.5 top-3 text-xs"></i>
        </div>

        <div class="text-xs text-slate-500 font-semibold">
          Đang tham gia: <span class="text-brand-600 font-bold">{{ filteredClassrooms().length }}</span> lớp học
        </div>
      </div>

      <!-- Classrooms Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let c of filteredClassrooms()"
             class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div class="flex items-start justify-between">
              <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                {{ c.subjectName }}
              </span>
              <span class="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200"
                    title="Mã lớp học">
                {{ c.code }}
              </span>
            </div>

            <h3 class="text-lg font-bold text-slate-900 mt-3 group-hover:text-brand-600 transition-colors">
              {{ c.name }}
            </h3>
            <p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {{ c.description || 'Chưa có mô tả lớp học.' }}
            </p>

            <div class="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div class="flex items-center text-slate-700">
                <i class="fa-solid fa-chalkboard-user text-brand-500 w-5"></i>
                <span>Giáo viên: <strong class="text-slate-900">{{ c.teacherName }}</strong></span>
              </div>
              <div class="flex items-center text-slate-500">
                <i class="fa-solid fa-user-group text-slate-400 w-5"></i>
                <span>{{ c.studentCount }} thành viên cùng lớp</span>
              </div>
              <div class="flex items-center text-slate-400 text-[11px]">
                <i class="fa-regular fa-calendar-check text-slate-400 w-5"></i>
                <span>Tham gia ngày: {{ c.createdAtUtc | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>
          </div>

          <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button (click)="viewClassmates(c)"
                    class="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center">
              <i class="fa-solid fa-users mr-1.5"></i>
              Xem bạn cùng lớp
            </button>
            <span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Đang học
            </span>
          </div>
        </div>

        <div *ngIf="filteredClassrooms().length === 0" class="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
          <i class="fa-solid fa-graduation-cap text-4xl text-slate-300 mb-3"></i>
          <p class="text-sm font-bold text-slate-700">Bạn chưa có lớp học nào</p>
          <p class="text-xs text-slate-400 mt-1">Bấm nút "Tham Gia Lớp Bằng Mã" ở góc phải để nhập mã tham gia từ thầy cô.</p>
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
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mã Lớp Học</label>
              <input type="text" [(ngModel)]="classCodeToJoin" name="classCodeToJoin" required
                     placeholder="Ví dụ: CLSA1B2C"
                     class="w-full text-base font-mono uppercase px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-center tracking-widest font-bold" />
              <p class="text-[11px] text-slate-400 mt-1.5 text-center">Mã lớp học gồm 6-8 ký tự do giáo viên cấp.</p>
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

      <!-- View Classmates Modal -->
      <div *ngIf="selectedClassroomForStudents()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-900">{{ selectedClassroomForStudents()?.name }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">Danh sách các bạn học sinh trong lớp</p>
            </div>
            <button (click)="selectedClassroomForStudents.set(null)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <div class="overflow-y-auto py-3 space-y-2 flex-1 divide-y divide-slate-50">
            <div *ngFor="let s of classmates()" class="flex items-center justify-between py-2 px-1">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  {{ s.studentName.charAt(0) }}
                </div>
                <div>
                  <div class="text-xs font-bold text-slate-900">{{ s.studentName }}</div>
                  <div class="text-[11px] text-slate-400">{{ s.studentEmail }}</div>
                </div>
              </div>
              <span class="text-[11px] text-slate-400">{{ s.joinedAtUtc | date:'dd/MM/yyyy' }}</span>
            </div>

            <div *ngIf="classmates().length === 0" class="py-6 text-center text-xs text-slate-400">
              Chưa có bạn học sinh nào khác trong lớp này.
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex justify-end">
            <button (click)="selectedClassroomForStudents.set(null)"
                    class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
              Đóng
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class StudentClassesComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  allClassrooms = signal<Classroom[]>([]);
  filteredClassrooms = signal<Classroom[]>([]);
  searchKeyword = '';

  showJoinModal = signal(false);
  classCodeToJoin = '';

  selectedClassroomForStudents = signal<Classroom | null>(null);
  classmates = signal<ClassroomStudent[]>([]);

  ngOnInit(): void {
    this.loadClassrooms();
  }

  loadClassrooms(): void {
    this.http.get<ApiResponse<Classroom[]>>(`${environment.apiUrl}/classrooms`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.allClassrooms.set(res.data);
          this.filterClasses();
        }
      },
      error: () => this.toast.error('Không thể tải danh sách lớp học.')
    });
  }

  filterClasses(): void {
    const kw = this.searchKeyword.trim().toLowerCase();
    if (!kw) {
      this.filteredClassrooms.set(this.allClassrooms());
      return;
    }
    const filtered = this.allClassrooms().filter(c =>
      c.name.toLowerCase().includes(kw) ||
      c.subjectName.toLowerCase().includes(kw) ||
      c.teacherName.toLowerCase().includes(kw) ||
      c.code.toLowerCase().includes(kw)
    );
    this.filteredClassrooms.set(filtered);
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
        this.loadClassrooms();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Không thể tham gia lớp học. Vui lòng kiểm tra mã.');
      }
    });
  }

  viewClassmates(classroom: Classroom): void {
    this.selectedClassroomForStudents.set(classroom);
    this.http.get<ApiResponse<ClassroomStudent[]>>(`${environment.apiUrl}/classrooms/${classroom.id}/students`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.classmates.set(res.data);
        }
      },
      error: () => this.toast.error('Không thể tải danh sách học sinh của lớp.')
    });
  }
}
