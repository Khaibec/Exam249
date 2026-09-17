import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthResponse, User, UserRole } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<User | null>(null);
  token = signal<string | null>(null);

  isAuthenticated = computed(() => !!this.currentUser() && !!this.token());
  isAdmin = computed(() => this.currentUser()?.role === UserRole.Admin);
  isTeacher = computed(() => this.currentUser()?.role === UserRole.Teacher);
  isStudent = computed(() => this.currentUser()?.role === UserRole.Student);

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    const savedToken = localStorage.getItem('exam249_token');
    const savedUser = localStorage.getItem('exam249_user');

    if (savedToken && savedUser) {
      try {
        this.token.set(savedToken);
        this.currentUser.set(JSON.parse(savedUser));
      } catch {
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setAuthSession(res.data);
        }
      })
    );
  }

  register(data: any): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, data).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setAuthSession(res.data);
        }
      })
    );
  }

  private setAuthSession(auth: AuthResponse): void {
    this.token.set(auth.accessToken);
    this.currentUser.set(auth.user);
    localStorage.setItem('exam249_token', auth.accessToken);
    localStorage.setItem('exam249_refresh_token', auth.refreshToken);
    localStorage.setItem('exam249_user', JSON.stringify(auth.user));
  }

  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('exam249_token');
    localStorage.removeItem('exam249_refresh_token');
    localStorage.removeItem('exam249_user');
    this.router.navigate(['/login']);
  }
}
