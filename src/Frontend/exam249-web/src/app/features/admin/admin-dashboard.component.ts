import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AdminDashboard, ApiResponse, PagedResult, User, UserRole } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Bảng Điều Khiển Quản Trị Viên</h1>
          <p class="text-sm text-slate-500 mt-1">Giám sát tổng thể người dùng, phòng học, câu hỏi và đề thi trên toàn hệ thống Exam249.</p>
        </div>
        <div class="mt-4 sm:mt-0 flex items-center space-x-2">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span class="w-2 h-2 rounded-full bg-purple-500 mr-2 animate-pulse"></span>
            Super Admin Mode
          </span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" *ngIf="dashboard() as stats">
        
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-users"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Người Dùng</span>
            <div class="text-2xl font-black text-slate-900 mt-0.5">{{ stats.totalUsers }}</div>
            <span class="text-xs text-slate-500 font-medium">{{ stats.totalTeachers }} GV • {{ stats.totalStudents }} HS</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-chalkboard"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Lớp Học</span>
            <div class="text-2xl font-black text-slate-900 mt-0.5">{{ stats.totalClassrooms }}</div>
            <span class="text-xs text-blue-600 font-medium">Đang hoạt động</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-layer-group"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Ngân Hàng Câu Hỏi</span>
            <div class="text-2xl font-black text-slate-900 mt-0.5">{{ stats.totalQuestions }}</div>
            <span class="text-xs text-slate-500 font-medium">Đa dạng 3 định dạng</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-square-poll-vertical"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm TB Toàn Trường</span>
            <div class="text-2xl font-black text-emerald-600 mt-0.5">{{ stats.averageSystemScore }} / 10</div>
            <span class="text-xs text-slate-500 font-medium">{{ stats.totalSubmissions }} lượt thi đã nộp</span>
          </div>
        </div>

      </div>

      <!-- User Management Section -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Danh Sách Người Dùng Hệ Thống</h2>
            <p class="text-xs text-slate-500">Phân quyền, kích hoạt hoặc khóa tài khoản thành viên.</p>
          </div>
          
          <!-- Filters -->
          <div class="flex items-center space-x-3">
            <div class="relative">
              <input type="text" [(ngModel)]="searchKeyword" (keyup.enter)="loadUsers()"
                     placeholder="Tìm họ tên, email..."
                     class="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 w-52" />
              <i class="fa-solid fa-magnifying-glass text-slate-400 absolute left-2.5 top-2.5 text-xs"></i>
            </div>
            <select [(ngModel)]="selectedRole" (change)="loadUsers()"
                    class="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option [ngValue]="null">Tất cả vai trò</option>
              <option [ngValue]="UserRole.Admin">Quản trị viên</option>
              <option [ngValue]="UserRole.Teacher">Giáo viên</option>
              <option [ngValue]="UserRole.Student">Học sinh</option>
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th class="py-3.5 px-4">Họ và Tên</th>
                <th class="py-3.5 px-4">Email</th>
                <th class="py-3.5 px-4">Vai Trò</th>
                <th class="py-3.5 px-4">Trạng Thái</th>
                <th class="py-3.5 px-4">Ngày Tạo</th>
                <th class="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr *ngFor="let u of users()" class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3.5 px-4 font-bold text-slate-900">{{ u.fullName }}</td>
                <td class="py-3.5 px-4 text-slate-600">{{ u.email }}</td>
                <td class="py-3.5 px-4">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                        [ngClass]="{
                          'bg-purple-100 text-purple-800': u.role === UserRole.Admin,
                          'bg-blue-100 text-blue-800': u.role === UserRole.Teacher,
                          'bg-emerald-100 text-emerald-800': u.role === UserRole.Student
                        }">
                    {{ getRoleLabel(u.role) }}
                  </span>
                </td>
                <td class="py-3.5 px-4">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                        [ngClass]="u.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'">
                    <span class="w-1.5 h-1.5 rounded-full mr-1.5" [ngClass]="u.isActive ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                    {{ u.isActive ? 'Hoạt động' : 'Đã khóa' }}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-slate-500 text-xs">{{ u.createdAtUtc | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="py-3.5 px-4 text-right">
                  <button (click)="toggleUserStatus(u)"
                          [disabled]="u.role === UserRole.Admin"
                          class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors border"
                          [ngClass]="u.isActive ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'">
                    {{ u.isActive ? 'Khóa' : 'Kích hoạt' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  UserRole = UserRole;
  dashboard = signal<AdminDashboard | null>(null);
  users = signal<User[]>([]);

  searchKeyword = '';
  selectedRole: UserRole | null = null;

  ngOnInit(): void {
    this.loadDashboard();
    this.loadUsers();
  }

  loadDashboard(): void {
    this.http.get<ApiResponse<AdminDashboard>>(`${environment.apiUrl}/reporting/admin/dashboard`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.dashboard.set(res.data);
        }
      }
    });
  }

  loadUsers(): void {
    let url = `${environment.apiUrl}/users?pageIndex=1&pageSize=50`;
    if (this.searchKeyword) url += `&search=${encodeURIComponent(this.searchKeyword)}`;
    if (this.selectedRole) url += `&role=${this.selectedRole}`;

    this.http.get<ApiResponse<PagedResult<User>>>(url).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.users.set(res.data.items);
        }
      }
    });
  }

  toggleUserStatus(user: User): void {
    const newStatus = !user.isActive;
    this.http.put<ApiResponse>(`${environment.apiUrl}/users/${user.id}/status`, { isActive: newStatus }).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.loadUsers();
      },
      error: () => this.toast.error('Không thể cập nhật trạng thái người dùng.')
    });
  }

  getRoleLabel(role: UserRole): string {
    switch (role) {
      case UserRole.Admin: return 'Admin';
      case UserRole.Teacher: return 'Giáo viên';
      case UserRole.Student: return 'Học sinh';
      default: return 'Khác';
    }
  }
}
