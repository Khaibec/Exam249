import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult, User, UserRole } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Người Dùng</h1>
          <p class="text-sm text-slate-500 mt-1">Danh sách tài khoản, phân quyền vai trò (Admin, Giáo viên, Học sinh) và trạng thái hoạt động.</p>
        </div>
        <div class="mt-4 sm:mt-0">
          <button (click)="openCreateModal()"
                  class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all">
            <i class="fa-solid fa-user-plus mr-2"></i>
            Thêm Người Dùng Mới
          </button>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchKeyword" (keyup.enter)="loadUsers()"
                 placeholder="Tìm theo họ tên, email..."
                 class="w-full text-xs pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <i class="fa-solid fa-magnifying-glass text-slate-400 absolute left-2.5 top-3 text-xs"></i>
        </div>

        <select [(ngModel)]="selectedRole" (change)="loadUsers()"
                class="text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option [ngValue]="null">Tất cả vai trò</option>
          <option [ngValue]="UserRole.Admin">Quản trị viên (Admin)</option>
          <option [ngValue]="UserRole.Teacher">Giáo viên (Teacher)</option>
          <option [ngValue]="UserRole.Student">Học sinh (Student)</option>
        </select>

        <button (click)="loadUsers()"
                class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
          Tìm kiếm
        </button>
      </div>

      <!-- Users Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th class="py-3.5 px-4">Người Dùng</th>
                <th class="py-3.5 px-4">Email</th>
                <th class="py-3.5 px-4">Số Điện Thoại</th>
                <th class="py-3.5 px-4">Vai Trò</th>
                <th class="py-3.5 px-4">Trạng Thái</th>
                <th class="py-3.5 px-4">Ngày Đăng Ký</th>
                <th class="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr *ngFor="let u of users()" class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3.5 px-4">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase"
                         [ngClass]="{
                           'bg-purple-100 text-purple-700': u.role === UserRole.Admin,
                           'bg-blue-100 text-blue-700': u.role === UserRole.Teacher,
                           'bg-emerald-100 text-emerald-700': u.role === UserRole.Student
                         }">
                      {{ u.fullName.charAt(0) }}
                    </div>
                    <span class="font-bold text-slate-900">{{ u.fullName }}</span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-slate-600">{{ u.email }}</td>
                <td class="py-3.5 px-4 text-slate-500">{{ u.phoneNumber || '—' }}</td>
                <td class="py-3.5 px-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
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
                          class="px-3 py-1 text-xs font-semibold rounded-lg transition-colors border"
                          [ngClass]="u.isActive ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'">
                    {{ u.isActive ? 'Khóa' : 'Kích hoạt' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create User Modal -->
      <div *ngIf="showCreateModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 class="text-lg font-bold text-slate-900">Thêm Người Dùng Mới</h3>
            <button (click)="showCreateModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form (submit)="createUser()" class="space-y-4 mt-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Họ Và Tên</label>
              <input type="text" [(ngModel)]="newFullName" name="newFullName" required
                     placeholder="Ví dụ: Nguyễn Văn Bình"
                     class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
              <input type="email" [(ngModel)]="newEmail" name="newEmail" required
                     placeholder="binh.nv@exam249.com"
                     class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mật Khẩu Khởi Tạo</label>
              <input type="password" [(ngModel)]="newPassword" name="newPassword" required
                     placeholder="••••••••"
                     class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Số Điện Thoại</label>
              <input type="text" [(ngModel)]="newPhone" name="newPhone"
                     placeholder="0987654321"
                     class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Vai Trò (Role)</label>
              <select [(ngModel)]="newRole" name="newRole" required
                      class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                <option [ngValue]="UserRole.Student">Học sinh (Student)</option>
                <option [ngValue]="UserRole.Teacher">Giáo viên (Teacher)</option>
                <option [ngValue]="UserRole.Admin">Quản trị viên (Admin)</option>
              </select>
            </div>

            <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" (click)="showCreateModal.set(false)"
                      class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                Hủy bỏ
              </button>
              <button type="submit"
                      class="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md">
                Tạo Tài Khoản
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
})
export class UserManagementComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  UserRole = UserRole;
  users = signal<User[]>([]);
  searchKeyword = '';
  selectedRole: UserRole | null = null;
  showCreateModal = signal(false);

  newFullName = '';
  newEmail = '';
  newPassword = 'Password@123';
  newPhone = '';
  newRole = UserRole.Student;

  ngOnInit(): void {
    this.loadUsers();
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

  openCreateModal(): void {
    this.newFullName = '';
    this.newEmail = '';
    this.newPassword = 'Password@123';
    this.newPhone = '';
    this.newRole = UserRole.Student;
    this.showCreateModal.set(true);
  }

  createUser(): void {
    if (!this.newFullName.trim() || !this.newEmail.trim() || !this.newPassword) {
      this.toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    const payload = {
      fullName: this.newFullName.trim(),
      email: this.newEmail.trim(),
      password: this.newPassword,
      phoneNumber: this.newPhone.trim(),
      role: this.newRole
    };

    this.http.post<ApiResponse<any>>(`${environment.apiUrl}/auth/register`, payload).subscribe({
      next: res => {
        this.toast.success(res.message || 'Tạo người dùng thành công!');
        this.showCreateModal.set(false);
        this.loadUsers();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Không thể tạo tài khoản.');
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
      case UserRole.Admin: return 'Quản trị viên';
      case UserRole.Teacher: return 'Giáo viên';
      case UserRole.Student: return 'Học sinh';
      default: return 'Khác';
    }
  }
}
