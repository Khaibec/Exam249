import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { LayoutComponent } from './shared/components/layout.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { UserRole } from './core/models/models';

import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';
import { TeacherDashboardComponent } from './features/teacher/teacher-dashboard.component';
import { ClassroomListComponent } from './features/teacher/classroom-list.component';
import { QuestionBankComponent } from './features/teacher/question-bank.component';
import { ExamManagerComponent } from './features/teacher/exam-manager.component';

import { StudentDashboardComponent } from './features/student/student-dashboard.component';
import { ExamRoomComponent } from './features/student/exam-room.component';
import { ExamResultComponent } from './features/student/exam-result.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  
  // Dedicated Exam Room (No navigation bar / sidebar to preserve fullscreen anti-cheat integrity)
  {
    path: 'exam-room/:examId',
    component: ExamRoomComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.Student] }
  },

  // Authenticated Portal Pages with Layout
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      // Admin Routes
      {
        path: 'admin/dashboard',
        component: AdminDashboardComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] }
      },
      {
        path: 'admin/users',
        component: AdminDashboardComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] }
      },
      {
        path: 'admin/subjects',
        component: AdminDashboardComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] }
      },

      // Teacher Routes
      {
        path: 'teacher/dashboard',
        component: TeacherDashboardComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRole.Teacher, UserRole.Admin] }
      },
      {
        path: 'teacher/classes',
        component: ClassroomListComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRole.Teacher, UserRole.Admin] }
      },
      {
        path: 'teacher/questions',
        component: QuestionBankComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRole.Teacher, UserRole.Admin] }
      },
      {
        path: 'teacher/exams',
        component: ExamManagerComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRole.Teacher, UserRole.Admin] }
      },

      // Student Routes
      {
        path: 'student/dashboard',
        component: StudentDashboardComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRole.Student] }
      },
      {
        path: 'student/classes',
        component: StudentDashboardComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRole.Student] }
      },
      {
        path: 'student/exams',
        component: StudentDashboardComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRole.Student] }
      },
      {
        path: 'exam-result/:sessionId',
        component: ExamResultComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRole.Student, UserRole.Teacher, UserRole.Admin] }
      },

      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
