import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiResponse, Classroom, Exam, ExamAnalytics, ExamStatus, ProctoringSnapshot, Question, RiskLevel, Subject, TeacherExamSubmissionItem, ViolationEvent } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { SecureImageComponent } from '../../shared/components/secure-image.component';

@Component({
  selector: 'app-exam-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SecureImageComponent],
  template: `
    <div class="space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Đề Thi & Giám Sát Kết Quả</h1>
          <p class="text-sm text-slate-500 mt-1">Tạo, chỉnh sửa đề thi, giám sát phòng thi trực tiếp và phân tích phổ điểm.</p>
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
            <div class="flex items-center justify-between gap-2">
              <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-50 text-brand-700 border border-brand-200 truncate">
                {{ ex.classroomName }}
              </span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                    [ngClass]="{
                      'bg-emerald-50 text-emerald-700 border border-emerald-200': ex.status === ExamStatus.Published,
                      'bg-amber-50 text-amber-700 border border-amber-200': ex.status === ExamStatus.Draft,
                      'bg-slate-100 text-slate-600 border border-slate-200': ex.status === ExamStatus.Archived
                    }">
                <span class="w-1.5 h-1.5 rounded-full mr-1.5"
                      [ngClass]="{
                        'bg-emerald-500': ex.status === ExamStatus.Published,
                        'bg-amber-500': ex.status === ExamStatus.Draft,
                        'bg-slate-400': ex.status === ExamStatus.Archived
                      }"></span>
                {{ getStatusLabel(ex.status) }}
              </span>
            </div>

            <h3 class="text-base font-bold text-slate-900 mt-3">{{ ex.title }}</h3>
            <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ ex.description }}</p>

            <!-- Exam Specs -->
            <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div><strong class="text-slate-900">Thời gian:</strong> {{ ex.durationMinutes }} phút</div>
              <div><strong class="text-slate-900">Điểm đạt:</strong> {{ ex.passingScore }} điểm</div>
              <div><strong class="text-slate-900">Số câu hỏi:</strong> {{ ex.questionCount }} câu</div>
              <div><strong class="text-slate-900">Số lần thi:</strong> Tối đa {{ ex.maxAttempts }}</div>
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
              <span *ngIf="ex.requireWebcam" class="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 rounded-md">
                <i class="fa-solid fa-video mr-1"></i> Bắt buộc Cam
              </span>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <a [routerLink]="['/teacher/exams', ex.id, 'proctoring']"
                 class="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors text-center flex items-center justify-center">
                <i class="fa-solid fa-tower-broadcast mr-1.5"></i> Giám Sát Live
              </a>
              <button (click)="viewSubmissions(ex)"
                      class="px-3 py-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors flex items-center justify-center">
                <i class="fa-solid fa-clipboard-check mr-1.5"></i> Bài Nộp
              </button>
            </div>
            <div class="flex items-center justify-between pt-1">
              <button (click)="viewAnalytics(ex)" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center">
                <i class="fa-solid fa-chart-column mr-1"></i> Phổ Điểm
              </button>
              <div class="flex items-center space-x-2">
                <button (click)="openEditModal(ex)" class="text-slate-400 hover:text-brand-600 text-xs p-1" title="Chỉnh sửa đề thi">
                  <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button (click)="deleteExam(ex.id)" class="text-slate-400 hover:text-rose-600 text-xs p-1" title="Xóa đề thi">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Submissions Modal (with Anti-Cheat Risk Scores & Detail Review) -->
      <div *ngIf="selectedExamForSubmissions() as ex" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Danh Sách Bài Nộp - {{ ex.title }}</h3>
              <p class="text-xs text-slate-500">Giám sát điểm số, xem chi tiết bài làm và kiểm tra ảnh webcam / vi phạm Anti-Cheat.</p>
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
                  <th class="py-3 px-3 text-right">Thao Tác</th>
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
                    <button (click)="inspectSubmissionSession(sub.sessionId, sub.studentName)"
                            class="inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer border"
                            [ngClass]="{
                              'bg-emerald-50 text-emerald-700 border-emerald-200': sub.riskLevel === RiskLevel.Safe,
                              'bg-amber-50 text-amber-700 border-amber-200': sub.riskLevel === RiskLevel.Suspicious,
                              'bg-orange-50 text-orange-700 border-orange-200': sub.riskLevel === RiskLevel.HighRisk,
                              'bg-rose-50 text-rose-700 border-rose-200': sub.riskLevel === RiskLevel.Critical
                            }">
                      {{ sub.riskScore }}đ ({{ sub.violationsCount }} lỗi) - {{ getRiskLevelLabel(sub.riskLevel) }}
                    </button>
                  </td>
                  <td class="py-3 px-3 text-right space-x-2">
                    <button (click)="openSubmissionResult(sub.sessionId)" class="text-indigo-600 hover:text-indigo-700 font-bold">
                      Xem bài làm
                    </button>
                    <button (click)="inspectSubmissionSession(sub.sessionId, sub.studentName)" class="text-brand-600 hover:text-brand-700 font-bold">
                      Ảnh & Vi phạm
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>

      <!-- Violations & Webcam Snapshots Detail Modal -->
      <div *ngIf="selectedSessionViolations()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900 flex items-center">
              <i class="fa-solid fa-shield-virus text-rose-500 mr-2"></i>
              Hồ Sơ Giám Sát - {{ inspectedStudentName() }}
            </h3>
            <button (click)="selectedSessionViolations.set(null)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <div class="flex items-center space-x-2 mt-3 border-b border-slate-100 pb-2">
            <button (click)="inspectionTab.set('violations')"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg"
                    [ngClass]="inspectionTab() === 'violations' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'">
              Nhật Ký Vi Phạm ({{ selectedSessionViolations()?.length || 0 }})
            </button>
            <button (click)="inspectionTab.set('snapshots')"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg"
                    [ngClass]="inspectionTab() === 'snapshots' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'">
              Ảnh Webcam ({{ selectedSessionSnapshots().length }})
            </button>
          </div>

          <div class="flex-1 overflow-y-auto mt-4">
            <div *ngIf="inspectionTab() === 'violations'" class="space-y-2.5">
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

            <div *ngIf="inspectionTab() === 'snapshots'">
              <div *ngIf="selectedSessionSnapshots().length === 0" class="text-center py-8 text-slate-400 text-xs">
                Chưa có ảnh giám sát webcam nào được ghi lại cho phiên thi này.
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div *ngFor="let snap of selectedSessionSnapshots()" class="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
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

      <!-- Exam Analytics Modal -->
      <div *ngIf="selectedAnalytics() as an" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Phân Tích Phổ Điểm Kỳ Thi</h3>
              <p class="text-xs text-slate-500">{{ an.title }} • {{ an.classroomName }}</p>
            </div>
            <button (click)="selectedAnalytics.set(null)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span class="text-[10px] font-bold text-slate-400 uppercase block">Bài Nộp</span>
              <span class="text-lg font-black text-slate-900">{{ an.totalSubmissions }}</span>
            </div>
            <div class="p-3 rounded-xl bg-brand-50 border border-brand-100">
              <span class="text-[10px] font-bold text-brand-600 uppercase block">Điểm TB</span>
              <span class="text-lg font-black text-brand-700">{{ an.averageScore }}</span>
            </div>
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span class="text-[10px] font-bold text-emerald-600 uppercase block">Tỷ Lệ Đạt</span>
              <span class="text-lg font-black text-emerald-700">{{ an.passRate }}%</span>
            </div>
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-100">
              <span class="text-[10px] font-bold text-rose-600 uppercase block">Rủi Ro Cao</span>
              <span class="text-lg font-black text-rose-700">{{ an.highRiskCount }}</span>
            </div>
          </div>

          <div class="space-y-2.5 text-xs">
            <div class="flex items-center justify-between text-slate-500 pb-1">
              <span>Phân bố điểm (Quy đổi thang 10)</span>
              <span>Cao nhất: <strong>{{ an.highestScore }}</strong> • Thấp nhất: <strong>{{ an.lowestScore }}</strong></span>
            </div>

            <div>
              <div class="flex justify-between mb-1"><span>Xuất sắc (&ge; 8.5)</span><strong>{{ an.excellentCount }}</strong></div>
              <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500" [style.width.%]="an.totalSubmissions ? (an.excellentCount / an.totalSubmissions) * 100 : 0"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between mb-1"><span>Khá (7.0 - 8.4)</span><strong>{{ an.goodCount }}</strong></div>
              <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-brand-500" [style.width.%]="an.totalSubmissions ? (an.goodCount / an.totalSubmissions) * 100 : 0"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between mb-1"><span>Trung bình (5.0 - 6.9)</span><strong>{{ an.averageCount }}</strong></div>
              <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-amber-500" [style.width.%]="an.totalSubmissions ? (an.averageCount / an.totalSubmissions) * 100 : 0"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between mb-1"><span>Yếu (&lt; 5.0)</span><strong>{{ an.weakCount }}</strong></div>
              <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-rose-500" [style.width.%]="an.totalSubmissions ? (an.weakCount / an.totalSubmissions) * 100 : 0"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create / Edit Exam Modal -->
      <div *ngIf="showModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 class="text-lg font-bold text-slate-900">{{ editingExamId() ? 'Chỉnh Sửa Đề Thi' : 'Tạo Đề Thi Mới' }}</h3>
            <button (click)="showModal.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form (submit)="saveExam()" class="space-y-4 mt-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tiêu Đề Kỳ Thi</label>
              <input type="text" [(ngModel)]="newTitle" name="newTitle" required
                     placeholder="Ví dụ: Kiểm tra 15 phút - Tin học cơ sở"
                     class="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mô Tả Kỳ Thi</label>
              <input type="text" [(ngModel)]="newDescription" name="newDescription"
                     placeholder="Mô tả ngắn nội dung kỳ thi..."
                     class="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
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

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Thời Gian Mở Đề</label>
                <input type="datetime-local" [(ngModel)]="newStartTimeLocal" name="newStartTimeLocal" required
                       class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Thời Gian Đóng Đề</label>
                <input type="datetime-local" [(ngModel)]="newEndTimeLocal" name="newEndTimeLocal" required
                       class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Thời Lượng (Phút)</label>
                <input type="number" [(ngModel)]="newDuration" name="newDuration" min="1" required
                       class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Điểm Đạt</label>
                <input type="number" [(ngModel)]="newPassingScore" name="newPassingScore" min="0.5" step="0.5" required
                       class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Số Lần Thi</label>
                <input type="number" [(ngModel)]="newMaxAttempts" name="newMaxAttempts" min="1" required
                       class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div *ngIf="editingExamId()">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Trạng Thái</label>
                <select [(ngModel)]="newStatus" name="newStatus"
                        class="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option [ngValue]="ExamStatus.Published">Đang mở</option>
                  <option [ngValue]="ExamStatus.Draft">Bản nháp</option>
                  <option [ngValue]="ExamStatus.Archived">Đã đóng</option>
                </select>
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

              <label class="flex items-center space-x-2 text-xs text-rose-700 font-semibold cursor-pointer">
                <input type="checkbox" [(ngModel)]="newRequireWebcam" name="newRequireWebcam" class="rounded text-rose-600" />
                <span>Bắt buộc học sinh bật Webcam giám sát trước khi vào phòng thi</span>
              </label>
            </div>

            <!-- Question Selection from Bank -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Chọn Câu Hỏi (Đã chọn: {{ selectedQuestionPoints.size }} câu)
                </span>
                <label class="flex items-center space-x-1.5 text-[11px] text-slate-600 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="filterQuestionsBySubject" name="filterQuestionsBySubject" />
                  <span>Chỉ hiện câu hỏi thuộc môn đã chọn</span>
                </label>
              </div>

              <div class="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div *ngFor="let q of displayedBankQuestions()"
                     class="p-2.5 flex items-center space-x-2 hover:bg-slate-50 transition-colors"
                     [ngClass]="{'bg-brand-50/60': selectedQuestionPoints.has(q.id)}">
                  <input type="checkbox"
                         [checked]="selectedQuestionPoints.has(q.id)"
                         (change)="toggleQuestionSelection(q)"
                         class="rounded text-brand-600 cursor-pointer" />
                  <div (click)="toggleQuestionSelection(q)" class="flex-1 text-xs cursor-pointer">
                    <span class="font-bold text-slate-900">{{ q.content }}</span>
                    <div class="text-[10px] text-slate-400 mt-0.5">{{ q.subjectName }} • Mặc định {{ q.defaultPoints }} điểm</div>
                  </div>
                  <div *ngIf="selectedQuestionPoints.has(q.id)" class="flex items-center space-x-1">
                    <input type="number"
                           [ngModel]="selectedQuestionPoints.get(q.id)"
                           (ngModelChange)="updateQuestionPoints(q.id, $event)"
                           [name]="'pts_' + q.id"
                           min="0.25" step="0.25"
                           class="w-16 text-xs px-2 py-1 border border-brand-300 rounded-lg text-center font-bold" />
                    <span class="text-[10px] text-slate-500">đ</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" (click)="showModal.set(false)"
                      class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                Hủy bỏ
              </button>
              <button type="submit"
                      class="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md">
                {{ editingExamId() ? 'Cập Nhật Đề Thi' : 'Phát Hành Đề Thi' }}
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
  private router = inject(Router);

  RiskLevel = RiskLevel;
  ExamStatus = ExamStatus;

  exams = signal<Exam[]>([]);
  subjects = signal<Subject[]>([]);
  classrooms = signal<Classroom[]>([]);
  availableQuestions = signal<Question[]>([]);

  showModal = signal(false);
  editingExamId = signal<string | null>(null);

  selectedExamForSubmissions = signal<Exam | null>(null);
  submissions = signal<TeacherExamSubmissionItem[]>([]);

  selectedSessionViolations = signal<ViolationEvent[] | null>(null);
  selectedSessionSnapshots = signal<ProctoringSnapshot[]>([]);
  inspectedStudentName = signal<string>('');
  inspectionTab = signal<'violations' | 'snapshots'>('violations');

  selectedAnalytics = signal<ExamAnalytics | null>(null);

  // Form State
  newTitle = '';
  newDescription = '';
  newSubjectId = '';
  newClassroomId = '';
  newStartTimeLocal = '';
  newEndTimeLocal = '';
  newDuration = 15;
  newPassingScore = 5.0;
  newMaxAttempts = 3;
  newStatus: ExamStatus = ExamStatus.Published;
  newShuffleQuestions = true;
  newShuffleOptions = true;
  newAllowReview = true;
  newRequireWebcam = false;
  filterQuestionsBySubject = false;
  selectedQuestionPoints = new Map<string, number>();

  displayedBankQuestions = computed(() => {
    const all = this.availableQuestions();
    if (!this.filterQuestionsBySubject || !this.newSubjectId) return all;
    return all.filter(q => q.subjectId === this.newSubjectId);
  });

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

    this.http.get<ApiResponse<any>>(`${environment.apiUrl}/questions?pageIndex=1&pageSize=200`).subscribe(res => {
      if (res.success && res.data) this.availableQuestions.set(res.data.items);
    });
  }

  private toDateTimeLocal(iso: string | Date): string {
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  openCreateModal(): void {
    this.editingExamId.set(null);
    this.newTitle = '';
    this.newDescription = '';
    this.newDuration = 15;
    this.newPassingScore = 5.0;
    this.newMaxAttempts = 3;
    this.newStatus = ExamStatus.Published;
    this.newShuffleQuestions = true;
    this.newShuffleOptions = true;
    this.newAllowReview = true;
    this.newRequireWebcam = false;
    this.newStartTimeLocal = this.toDateTimeLocal(new Date(Date.now() - 3600000));
    this.newEndTimeLocal = this.toDateTimeLocal(new Date(Date.now() + 30 * 86400000));
    this.selectedQuestionPoints.clear();

    if (this.subjects().length > 0) this.newSubjectId = this.subjects()[0].id;
    if (this.classrooms().length > 0) this.newClassroomId = this.classrooms()[0].id;

    this.availableQuestions().slice(0, 5).forEach(q => this.selectedQuestionPoints.set(q.id, q.defaultPoints || 2.0));
    this.showModal.set(true);
  }

  openEditModal(ex: Exam): void {
    this.http.get<ApiResponse<Exam>>(`${environment.apiUrl}/exams/${ex.id}`).subscribe({
      next: res => {
        if (!res.success || !res.data) return;
        const full = res.data;
        this.editingExamId.set(full.id);
        this.newTitle = full.title;
        this.newDescription = full.description;
        this.newSubjectId = full.subjectId;
        this.newClassroomId = full.classroomId;
        this.newStartTimeLocal = this.toDateTimeLocal(full.startTimeUtc);
        this.newEndTimeLocal = this.toDateTimeLocal(full.endTimeUtc);
        this.newDuration = full.durationMinutes;
        this.newPassingScore = full.passingScore;
        this.newMaxAttempts = full.maxAttempts;
        this.newStatus = full.status;
        this.newShuffleQuestions = full.shuffleQuestions;
        this.newShuffleOptions = full.shuffleOptions;
        this.newAllowReview = full.allowReview;
        this.newRequireWebcam = !!full.requireWebcam;
        this.selectedQuestionPoints.clear();
        (full.questions || []).forEach(q => this.selectedQuestionPoints.set(q.questionId, q.points));
        this.showModal.set(true);
      }
    });
  }

  toggleQuestionSelection(q: Question): void {
    if (this.selectedQuestionPoints.has(q.id)) {
      this.selectedQuestionPoints.delete(q.id);
    } else {
      this.selectedQuestionPoints.set(q.id, q.defaultPoints || 2.0);
    }
  }

  updateQuestionPoints(qId: string, pts: number): void {
    this.selectedQuestionPoints.set(qId, pts > 0 ? pts : 1.0);
  }

  saveExam(): void {
    if (!this.newTitle || !this.newSubjectId || !this.newClassroomId) {
      this.toast.error('Vui lòng điền đầy đủ tiêu đề, môn và lớp học.');
      return;
    }

    if (this.selectedQuestionPoints.size === 0) {
      this.toast.error('Vui lòng chọn ít nhất một câu hỏi cho đề thi.');
      return;
    }

    const startUtc = new Date(this.newStartTimeLocal).toISOString();
    const endUtc = new Date(this.newEndTimeLocal).toISOString();
    if (endUtc <= startUtc) {
      this.toast.error('Thời gian đóng đề phải sau thời gian mở đề.');
      return;
    }

    const questionsPayload = Array.from(this.selectedQuestionPoints.entries()).map(([qid, points], idx) => ({
      questionId: qid,
      points,
      orderIndex: idx + 1
    }));

    const payload: any = {
      title: this.newTitle.trim(),
      description: this.newDescription.trim() || `Đề thi thời lượng ${this.newDuration} phút gồm ${questionsPayload.length} câu hỏi.`,
      subjectId: this.newSubjectId,
      classroomId: this.newClassroomId,
      startTimeUtc: startUtc,
      endTimeUtc: endUtc,
      durationMinutes: this.newDuration,
      passingScore: this.newPassingScore,
      maxAttempts: this.newMaxAttempts,
      shuffleQuestions: this.newShuffleQuestions,
      shuffleOptions: this.newShuffleOptions,
      showResultsImmediately: true,
      allowReview: this.newAllowReview,
      requireWebcam: this.newRequireWebcam,
      questions: questionsPayload
    };

    const editId = this.editingExamId();
    const req$ = editId
      ? this.http.put<ApiResponse>(`${environment.apiUrl}/exams/${editId}`, { ...payload, status: this.newStatus })
      : this.http.post<ApiResponse<Exam>>(`${environment.apiUrl}/exams`, payload);

    req$.subscribe({
      next: res => {
        this.toast.success(res.message);
        this.showModal.set(false);
        this.loadExams();
      },
      error: err => this.toast.error(err.error?.message || 'Không thể lưu đề thi.')
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

  openSubmissionResult(sessionId: string): void {
    this.selectedExamForSubmissions.set(null);
    this.router.navigate(['/exam-result', sessionId]);
  }

  inspectSubmissionSession(sessionId: string, studentName: string): void {
    this.inspectedStudentName.set(studentName);
    this.inspectionTab.set('violations');

    this.http.get<ApiResponse<ViolationEvent[]>>(`${environment.apiUrl}/anticheat/sessions/${sessionId}/violations`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.selectedSessionViolations.set(res.data);
        }
      }
    });

    this.http.get<ApiResponse<ProctoringSnapshot[]>>(`${environment.apiUrl}/anticheat/sessions/${sessionId}/snapshots`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.selectedSessionSnapshots.set(res.data);
        }
      }
    });
  }

  viewAnalytics(ex: Exam): void {
    this.http.get<ApiResponse<ExamAnalytics>>(`${environment.apiUrl}/reporting/exams/${ex.id}/analytics`).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.selectedAnalytics.set(res.data);
        }
      },
      error: () => this.toast.error('Không thể tải dữ liệu phân tích kỳ thi.')
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

  getStatusLabel(status: ExamStatus): string {
    switch (status) {
      case ExamStatus.Published: return 'Đang mở';
      case ExamStatus.Draft: return 'Bản nháp';
      case ExamStatus.Archived: return 'Đã đóng';
      default: return 'Đang mở';
    }
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
