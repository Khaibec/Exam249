using Exam249.IdentityService.Entities;
using Exam249.Shared.Common.Security;
using Exam249.Shared.Contracts.Enums;
using Microsoft.EntityFrameworkCore;

namespace Exam249.IdentityService.Data;

public static class IdentityDbSeeder
{
    // Fixed Guids for easy cross-service reference in seed data
    public static readonly Guid AdminId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid TeacherId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid Student1Id = Guid.Parse("33333333-3333-3333-3333-333333333331");
    public static readonly Guid Student2Id = Guid.Parse("33333333-3333-3333-3333-333333333332");

    public static async Task SeedAsync(IdentityDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        if (!await context.Users.AnyAsync())
        {
            var users = new List<ApplicationUser>
            {
                new()
                {
                    Id = AdminId,
                    Email = "admin@exam249.com",
                    PasswordHash = PasswordHasher.HashPassword("Admin@123456"),
                    FullName = "Quản trị viên Hệ thống",
                    PhoneNumber = "0901234567",
                    Role = UserRole.Admin,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = TeacherId,
                    Email = "teacher@exam249.com",
                    PasswordHash = PasswordHasher.HashPassword("Teacher@123456"),
                    FullName = "Thầy Nguyễn Văn An (Giáo viên)",
                    PhoneNumber = "0912345678",
                    Role = UserRole.Teacher,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Student1Id,
                    Email = "student1@exam249.com",
                    PasswordHash = PasswordHasher.HashPassword("Student@123456"),
                    FullName = "Trần Minh Quang (Học sinh 1)",
                    PhoneNumber = "0923456789",
                    Role = UserRole.Student,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Student2Id,
                    Email = "student2@exam249.com",
                    PasswordHash = PasswordHasher.HashPassword("Student@123456"),
                    FullName = "Lê Thị Mai (Học sinh 2)",
                    PhoneNumber = "0934567890",
                    Role = UserRole.Student,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            };

            await context.Users.AddRangeAsync(users);
            await context.SaveChangesAsync();
        }
    }
}
