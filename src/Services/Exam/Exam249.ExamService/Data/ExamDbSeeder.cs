using Exam249.ExamService.Entities;
using Exam249.Shared.Contracts.Enums;
using Microsoft.EntityFrameworkCore;

namespace Exam249.ExamService.Data;

public static class ExamDbSeeder
{
    public static readonly Guid SubjectMathId = Guid.Parse("aaaa1111-1111-1111-1111-111111111111");
    public static readonly Guid SubjectITId = Guid.Parse("bbbb2222-2222-2222-2222-222222222222");

    public static readonly Guid Classroom1Id = Guid.Parse("dddd4444-4444-4444-4444-444444444441"); // 12A1
    public static readonly Guid Classroom2Id = Guid.Parse("dddd4444-4444-4444-4444-444444444442"); // CNTT01

    public static readonly Guid TeacherId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    public static readonly Guid ExamITId = Guid.Parse("ee111111-1111-1111-1111-111111111111");
    public static readonly Guid ExamMathId = Guid.Parse("ee222222-2222-2222-2222-222222222222");

    public static readonly Guid Q_IT_1 = Guid.Parse("10000000-0000-0000-0000-000000000001");
    public static readonly Guid Q_IT_2 = Guid.Parse("10000000-0000-0000-0000-000000000002");
    public static readonly Guid Q_IT_3 = Guid.Parse("10000000-0000-0000-0000-000000000003");
    public static readonly Guid Q_IT_4 = Guid.Parse("10000000-0000-0000-0000-000000000004");
    public static readonly Guid Q_IT_5 = Guid.Parse("10000000-0000-0000-0000-000000000005");

    public static readonly Guid Q_Math_1 = Guid.Parse("20000000-0000-0000-0000-000000000001");
    public static readonly Guid Q_Math_2 = Guid.Parse("20000000-0000-0000-0000-000000000002");
    public static readonly Guid Q_Math_3 = Guid.Parse("20000000-0000-0000-0000-000000000003");
    public static readonly Guid Q_Math_4 = Guid.Parse("20000000-0000-0000-0000-000000000004");
    public static readonly Guid Q_Math_5 = Guid.Parse("20000000-0000-0000-0000-000000000005");

    public static async Task SeedAsync(ExamDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        if (!await context.Exams.AnyAsync())
        {
            var examIT = new Exam
            {
                Id = ExamITId,
                Title = "Kiểm tra 15 phút - Kiến trúc Microservices & C# .NET",
                Description = "Đề kiểm tra nhanh kiến thức tổng quan về Microservices, OOP trong C#, HTTP protocol và API Gateway.",
                SubjectId = SubjectITId,
                SubjectName = "Tin Học & Lập Trình",
                ClassroomId = Classroom2Id,
                ClassroomName = "CNTT - Lập trình Web C# / .NET",
                TeacherId = TeacherId,
                TeacherName = "Thầy Nguyễn Văn An",
                StartTimeUtc = DateTime.UtcNow.AddDays(-1),
                EndTimeUtc = DateTime.UtcNow.AddDays(30),
                DurationMinutes = 15,
                PassingScore = 5.0,
                MaxAttempts = 3,
                ShuffleQuestions = true,
                ShuffleOptions = true,
                ShowResultsImmediately = true,
                AllowReview = true,
                Status = ExamStatus.Published,
                CreatedAtUtc = DateTime.UtcNow,
                Questions = new List<ExamQuestion>
                {
                    new()
                    {
                        QuestionId = Q_IT_1,
                        Content = "Trong kiến trúc Microservices, thành phần nào thường đóng vai trò là điểm tiếp nhận yêu cầu duy nhất cho Client?",
                        Type = QuestionType.SingleChoice,
                        Difficulty = DifficultyLevel.Medium,
                        Points = 2.0,
                        OrderIndex = 1
                    },
                    new()
                    {
                        QuestionId = Q_IT_2,
                        Content = "Các ngôn ngữ nào sau đây là ngôn ngữ lập trình hỗ trợ lập trình hướng đối tượng (OOP)?",
                        Type = QuestionType.MultipleChoice,
                        Difficulty = DifficultyLevel.Easy,
                        Points = 2.0,
                        OrderIndex = 2
                    },
                    new()
                    {
                        QuestionId = Q_IT_3,
                        Content = "Từ khóa nào trong C# được sử dụng để định nghĩa một lớp không cho phép kế thừa?",
                        Type = QuestionType.FillInTheBlank,
                        Difficulty = DifficultyLevel.Medium,
                        Points = 2.0,
                        OrderIndex = 3
                    },
                    new()
                    {
                        QuestionId = Q_IT_4,
                        Content = "Giao thức nào cung cấp kênh truyền thông bảo mật, mã hóa dữ liệu giữa trình duyệt và máy chủ web?",
                        Type = QuestionType.SingleChoice,
                        Difficulty = DifficultyLevel.Easy,
                        Points = 2.0,
                        OrderIndex = 4
                    },
                    new()
                    {
                        QuestionId = Q_IT_5,
                        Content = "Mã trạng thái HTTP nào biểu thị một yêu cầu đã được xử lý thành công?",
                        Type = QuestionType.FillInTheBlank,
                        Difficulty = DifficultyLevel.Easy,
                        Points = 2.0,
                        OrderIndex = 5
                    }
                }
            };

            var examMath = new Exam
            {
                Id = ExamMathId,
                Title = "Thi thử Tốt nghiệp THPT Quốc Gia - Môn Toán (Đề 101)",
                Description = "Đề thi thử gồm 5 câu hỏi trọng tâm Giải tích, Số học và Đại số lớp 12.",
                SubjectId = SubjectMathId,
                SubjectName = "Toán Học",
                ClassroomId = Classroom1Id,
                ClassroomName = "12A1 - Luyện thi THPT Quốc Gia",
                TeacherId = TeacherId,
                TeacherName = "Thầy Nguyễn Văn An",
                StartTimeUtc = DateTime.UtcNow.AddDays(-1),
                EndTimeUtc = DateTime.UtcNow.AddDays(30),
                DurationMinutes = 45,
                PassingScore = 5.0,
                MaxAttempts = 2,
                ShuffleQuestions = true,
                ShuffleOptions = true,
                ShowResultsImmediately = true,
                AllowReview = true,
                Status = ExamStatus.Published,
                CreatedAtUtc = DateTime.UtcNow,
                Questions = new List<ExamQuestion>
                {
                    new()
                    {
                        QuestionId = Q_Math_1,
                        Content = "Đạo hàm của hàm số y = x^3 - 3x + 2 là gì?",
                        Type = QuestionType.SingleChoice,
                        Difficulty = DifficultyLevel.Easy,
                        Points = 2.0,
                        OrderIndex = 1
                    },
                    new()
                    {
                        QuestionId = Q_Math_2,
                        Content = "Những số nào sau đây là số nguyên tố?",
                        Type = QuestionType.MultipleChoice,
                        Difficulty = DifficultyLevel.Easy,
                        Points = 2.0,
                        OrderIndex = 2
                    },
                    new()
                    {
                        QuestionId = Q_Math_3,
                        Content = "Tập xác định của hàm số y = 1 / (x - 2) là gì?",
                        Type = QuestionType.SingleChoice,
                        Difficulty = DifficultyLevel.Easy,
                        Points = 2.0,
                        OrderIndex = 3
                    },
                    new()
                    {
                        QuestionId = Q_Math_4,
                        Content = "Giá trị của tích phân I = ∫ (từ 0 đến 1) của 2x dx bằng bao nhiêu?",
                        Type = QuestionType.FillInTheBlank,
                        Difficulty = DifficultyLevel.Medium,
                        Points = 2.0,
                        OrderIndex = 4
                    },
                    new()
                    {
                        QuestionId = Q_Math_5,
                        Content = "Phương trình bậc hai ax^2 + bx + c = 0 (với a khác 0) có nghiệm kép khi biệt thức Delta (b^2 - 4ac) bằng bao nhiêu?",
                        Type = QuestionType.FillInTheBlank,
                        Difficulty = DifficultyLevel.Easy,
                        Points = 2.0,
                        OrderIndex = 5
                    }
                }
            };

            await context.Exams.AddRangeAsync(examIT, examMath);
            await context.SaveChangesAsync();
        }
    }
}
