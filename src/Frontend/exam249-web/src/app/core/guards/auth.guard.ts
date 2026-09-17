import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/models';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles = route.data?.['roles'] as UserRole[];
  const user = authService.currentUser();

  if (user && expectedRoles && expectedRoles.includes(user.role)) {
    return true;
  }

  // Redirect to their respective default home
  if (user?.role === UserRole.Admin) router.navigate(['/admin/dashboard']);
  else if (user?.role === UserRole.Teacher) router.navigate(['/teacher/dashboard']);
  else if (user?.role === UserRole.Student) router.navigate(['/student/dashboard']);
  else router.navigate(['/login']);

  return false;
};
