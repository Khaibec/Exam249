using Exam249.ClassroomService.Entities;
using Microsoft.EntityFrameworkCore;

namespace Exam249.ClassroomService.Data;

public static class ClassroomDbSeeder
{
    public static readonly Guid SubjectMathId = Guid.Parse("aaaa1111-1111-1111-1111-111111111111");
    public static readonly Guid SubjectITId = Guid.Parse("bbbb2222-2222-2222-2222-222222222222");
    public static readonly Guid SubjectEnglishId = Guid.Parse("cccc3333-3333-3333-3333-333333333333");

    public static readonly Guid Classroom1Id = Guid.Parse("dddd4444-4444-4444-4444-444444444441");
    public static readonly Guid Classroom2Id = Guid.Parse("dddd4444-4444-4444-4444-444444444442");

    public static readonly Guid TeacherId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid Student1Id = Guid.Parse("33333333-3333-3333-3333-333333333331");
    public static readonly Guid Student2Id = Guid.Parse("33333333-3333-3333-3333-333333333332");

    public static async Task SeedAsync(ClassroomDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        if (!await context.Subjects.AnyAsync())
        {
            var subjects = new List<Subject>
            {
                new()
                {
                    Id = SubjectMathId,
                    Code = "MATH",
                    Name = "Toán Học",
                    Description = "Môn Toán lớp 12 và luyện thi THPT Quốc Gia",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = SubjectITId,
                    Code = "IT",
                    Name = "Tin Học & Lập Trình",
                    Description = "Khoa học máy tính, cơ sở dữ liệu và công nghệ phần mềm",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = SubjectEnglishId,
                    Code = "ENG",
                    Name = "Tiếng Anh",
                    Description = "Ngữ pháp, từ vựng và đọc hiểu tiếng Anh học thuật",
                    CreatedAtUtc = DateTime.UtcNow
                }
            };

            await context.Subjects.AddRangeAsync(subjects);
            await context.SaveChangesAsync();
        }

        if (!await context.Classrooms.AnyAsync())
        {
            var classrooms = new List<Classroom>
            {
                new()
                {
                    Id = Classroom1Id,
                    Name = "12A1 - Luyện thi THPT Quốc Gia",
                    Code = "THPT12A1",
                    Description = "Lớp luyện đề trọng điểm môn Toán năm học 2026",
                    TeacherId = TeacherId,
                    TeacherName = "Thầy Nguyễn Văn An",
                    SubjectId = SubjectMathId,
                    CreatedAtUtc = DateTime.UtcNow,
                    Students = new List<ClassroomStudent>
                    {
                        new()
                        {
                            StudentId = Student1Id,
                            StudentName = "Trần Minh Quang",
                            StudentEmail = "student1@exam249.com",
                            JoinedAtUtc = DateTime.UtcNow
                        },
                        new()
                        {
                            StudentId = Student2Id,
                            StudentName = "Lê Thị Mai",
                            StudentEmail = "student2@exam249.com",
                            JoinedAtUtc = DateTime.UtcNow
                        }
                    }
                },
                new()
                {
                    Id = Classroom2Id,
                    Name = "CNTT - Lập trình Web C# / .NET",
                    Code = "DOTNET01",
                    Description = "Lớp học phần kiến trúc Microservices và ASP.NET Core",
                    TeacherId = TeacherId,
                    TeacherName = "Thầy Nguyễn Văn An",
                    SubjectId = SubjectITId,
                    CreatedAtUtc = DateTime.UtcNow,
                    Students = new List<ClassroomStudent>
                    {
                        new()
                        {
                            StudentId = Student1Id,
                            StudentName = "Trần Minh Quang",
                            StudentEmail = "student1@exam249.com",
                            JoinedAtUtc = DateTime.UtcNow
                        }
                    }
                }
            };

            await context.Classrooms.AddRangeAsync(classrooms);
            await context.SaveChangesAsync();
        }
    }
}
