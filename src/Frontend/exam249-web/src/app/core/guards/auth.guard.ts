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

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  // Parse user role as number to handle both numeric (1,2,3) and string ("1","2","3","Admin",etc.) representations
  const userRoleNum = Number(user.role);
  const hasRole = expectedRoles && expectedRoles.some(r =>
    r === user.role ||
    r === userRoleNum ||
    UserRole[r] === (user.role as any)
  );

  if (hasRole) {
    return true;
  }

  // Redirect to their respective default home only if unauthorized for this specific page
  if (userRoleNum === UserRole.Admin || (user.role as any) === 'Admin') {
    router.navigate(['/admin/dashboard']);
  } else if (userRoleNum === UserRole.Teacher || (user.role as any) === 'Teacher') {
    router.navigate(['/teacher/dashboard']);
  } else if (userRoleNum === UserRole.Student || (user.role as any) === 'Student') {
    router.navigate(['/student/dashboard']);
  } else {
    router.navigate(['/login']);
  }

  return false;
};
