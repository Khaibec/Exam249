using Exam249.QuestionBankService.Entities;
using Exam249.Shared.Contracts.Enums;
using Microsoft.EntityFrameworkCore;

namespace Exam249.QuestionBankService.Data;

public static class QuestionBankDbSeeder
{
    public static readonly Guid SubjectMathId = Guid.Parse("aaaa1111-1111-1111-1111-111111111111");
    public static readonly Guid SubjectITId = Guid.Parse("bbbb2222-2222-2222-2222-222222222222");
    public static readonly Guid SubjectEnglishId = Guid.Parse("cccc3333-3333-3333-3333-333333333333");

    // Predefined question IDs for Exam seeding
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

    public static async Task SeedAsync(QuestionBankDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        if (!await context.Questions.AnyAsync())
        {
            var questions = new List<Question>
            {
                // IT Questions
                new()
                {
                    Id = Q_IT_1,
                    SubjectId = SubjectITId,
                    SubjectName = "Tin Học & Lập Trình",
                    Content = "Trong kiến trúc Microservices, thành phần nào thường đóng vai trò là điểm tiếp nhận yêu cầu duy nhất cho Client?",
                    Type = QuestionType.SingleChoice,
                    Difficulty = DifficultyLevel.Medium,
                    DefaultPoints = 2.0,
                    Explanation = "API Gateway đóng vai trò làm reverse proxy, định tuyến yêu cầu và tập trung các chức năng cross-cutting như xác thực, rate limiting.",
                    Tags = "Microservices, Architecture, Gateway",
                    Options = new List<QuestionOption>
                    {
                        new() { Content = "API Gateway", IsCorrect = true, OrderIndex = 1 },
                        new() { Content = "Message Queue", IsCorrect = false, OrderIndex = 2 },
                        new() { Content = "Database Server", IsCorrect = false, OrderIndex = 3 },
                        new() { Content = "Service Discovery", IsCorrect = false, OrderIndex = 4 }
                    }
                },
                new()
                {
                    Id = Q_IT_2,
                    SubjectId = SubjectITId,
                    SubjectName = "Tin Học & Lập Trình",
                    Content = "Các ngôn ngữ nào sau đây là ngôn ngữ lập trình hỗ trợ lập trình hướng đối tượng (OOP)?",
                    Type = QuestionType.MultipleChoice,
                    Difficulty = DifficultyLevel.Easy,
                    DefaultPoints = 2.0,
                    Explanation = "C#, Java và Python đều hỗ trợ OOP. HTML là ngôn ngữ đánh dấu siêu văn bản, không phải ngôn ngữ lập trình.",
                    Tags = "OOP, Programming, C#, Java",
                    Options = new List<QuestionOption>
                    {
                        new() { Content = "C#", IsCorrect = true, OrderIndex = 1 },
                        new() { Content = "Java", IsCorrect = true, OrderIndex = 2 },
                        new() { Content = "HTML", IsCorrect = false, OrderIndex = 3 },
                        new() { Content = "Python", IsCorrect = true, OrderIndex = 4 }
                    }
                },
                new()
                {
                    Id = Q_IT_3,
                    SubjectId = SubjectITId,
                    SubjectName = "Tin Học & Lập Trình",
                    Content = "Từ khóa nào trong C# được sử dụng để định nghĩa một lớp không cho phép kế thừa?",
                    Type = QuestionType.FillInTheBlank,
                    Difficulty = DifficultyLevel.Medium,
                    DefaultPoints = 2.0,
                    Explanation = "Từ khóa 'sealed' ngăn chặn các lớp khác kế thừa từ lớp này.",
                    Tags = "C#, OOP, Keywords",
                    AcceptedAnswers = new List<QuestionAcceptedAnswer>
                    {
                        new() { AnswerText = "sealed" },
                        new() { AnswerText = "sealed class" }
                    }
                },
                new()
                {
                    Id = Q_IT_4,
                    SubjectId = SubjectITId,
                    SubjectName = "Tin Học & Lập Trình",
                    Content = "Giao thức nào cung cấp kênh truyền thông bảo mật, mã hóa dữ liệu giữa trình duyệt và máy chủ web?",
                    Type = QuestionType.SingleChoice,
                    Difficulty = DifficultyLevel.Easy,
                    DefaultPoints = 2.0,
                    Explanation = "HTTPS sử dụng SSL/TLS để mã hóa dữ liệu truyền tải giữa client và server.",
                    Tags = "Network, Web, Security",
                    Options = new List<QuestionOption>
                    {
                        new() { Content = "HTTPS", IsCorrect = true, OrderIndex = 1 },
                        new() { Content = "HTTP", IsCorrect = false, OrderIndex = 2 },
                        new() { Content = "FTP", IsCorrect = false, OrderIndex = 3 },
                        new() { Content = "Telnet", IsCorrect = false, OrderIndex = 4 }
                    }
                },
                new()
                {
                    Id = Q_IT_5,
                    SubjectId = SubjectITId,
                    SubjectName = "Tin Học & Lập Trình",
                    Content = "Mã trạng thái HTTP nào biểu thị một yêu cầu đã được xử lý thành công?",
                    Type = QuestionType.FillInTheBlank,
                    Difficulty = DifficultyLevel.Easy,
                    DefaultPoints = 2.0,
                    Explanation = "HTTP 200 OK biểu thị yêu cầu đã được server xử lý thành công.",
                    Tags = "HTTP, Web, StatusCodes",
                    AcceptedAnswers = new List<QuestionAcceptedAnswer>
                    {
                        new() { AnswerText = "200" },
                        new() { AnswerText = "200 OK" }
                    }
                },

                // Math Questions
                new()
                {
                    Id = Q_Math_1,
                    SubjectId = SubjectMathId,
                    SubjectName = "Toán Học",
                    Content = "Đạo hàm của hàm số y = x^3 - 3x + 2 là gì?",
                    Type = QuestionType.SingleChoice,
                    Difficulty = DifficultyLevel.Easy,
                    DefaultPoints = 2.0,
                    Explanation = "y' = (x^3)' - (3x)' + (2)' = 3x^2 - 3.",
                    Tags = "Đạo hàm, Giải tích, Lớp 12",
                    Options = new List<QuestionOption>
                    {
                        new() { Content = "3x^2 - 3", IsCorrect = true, OrderIndex = 1 },
                        new() { Content = "3x^2 + 3", IsCorrect = false, OrderIndex = 2 },
                        new() { Content = "x^2 - 3", IsCorrect = false, OrderIndex = 3 },
                        new() { Content = "3x - 3", IsCorrect = false, OrderIndex = 4 }
                    }
                },
                new()
                {
                    Id = Q_Math_2,
                    SubjectId = SubjectMathId,
                    SubjectName = "Toán Học",
                    Content = "Những số nào sau đây là số nguyên tố?",
                    Type = QuestionType.MultipleChoice,
                    Difficulty = DifficultyLevel.Easy,
                    DefaultPoints = 2.0,
                    Explanation = "Số nguyên tố là số tự nhiên lớn hơn 1 chỉ có 2 ước là 1 và chính nó. 2, 7, 13 là số nguyên tố; 9 chia hết cho 3 nên là hợp số.",
                    Tags = "Số học, Nguyên tố",
                    Options = new List<QuestionOption>
                    {
                        new() { Content = "2", IsCorrect = true, OrderIndex = 1 },
                        new() { Content = "7", IsCorrect = true, OrderIndex = 2 },
                        new() { Content = "9", IsCorrect = false, OrderIndex = 3 },
                        new() { Content = "13", IsCorrect = true, OrderIndex = 4 }
                    }
                },
                new()
                {
                    Id = Q_Math_3,
                    SubjectId = SubjectMathId,
                    SubjectName = "Toán Học",
                    Content = "Tập xác định của hàm số y = 1 / (x - 2) là gì?",
                    Type = QuestionType.SingleChoice,
                    Difficulty = DifficultyLevel.Easy,
                    DefaultPoints = 2.0,
                    Explanation = "Điều kiện xác định là mẫu số x - 2 khác 0, suy ra x khác 2. Do đó D = R \\ {2}.",
                    Tags = "Hàm số, Tập xác định",
                    Options = new List<QuestionOption>
                    {
                        new() { Content = "R \\ {2}", IsCorrect = true, OrderIndex = 1 },
                        new() { Content = "R", IsCorrect = false, OrderIndex = 2 },
                        new() { Content = "(2; +∞)", IsCorrect = false, OrderIndex = 3 },
                        new() { Content = "(-∞; 2)", IsCorrect = false, OrderIndex = 4 }
                    }
                },
                new()
                {
                    Id = Q_Math_4,
                    SubjectId = SubjectMathId,
                    SubjectName = "Toán Học",
                    Content = "Giá trị của tích phân I = ∫ (từ 0 đến 1) của 2x dx bằng bao nhiêu?",
                    Type = QuestionType.FillInTheBlank,
                    Difficulty = DifficultyLevel.Medium,
                    DefaultPoints = 2.0,
                    Explanation = "∫ 2x dx = x^2. Thay cận từ 0 đến 1 ta có 1^2 - 0^2 = 1.",
                    Tags = "Tích phân, Giải tích 12",
                    AcceptedAnswers = new List<QuestionAcceptedAnswer>
                    {
                        new() { AnswerText = "1" },
                        new() { AnswerText = "1.0" },
                        new() { AnswerText = "một" }
                    }
                },
                new()
                {
                    Id = Q_Math_5,
                    SubjectId = SubjectMathId,
                    SubjectName = "Toán Học",
                    Content = "Phương trình bậc hai ax^2 + bx + c = 0 (với a khác 0) có nghiệm kép khi biệt thức Delta (b^2 - 4ac) bằng bao nhiêu?",
                    Type = QuestionType.FillInTheBlank,
                    Difficulty = DifficultyLevel.Easy,
                    DefaultPoints = 2.0,
                    Explanation = "Phương trình bậc hai có nghiệm kép khi và chỉ khi Delta = 0.",
                    Tags = "Phương trình, Đại số",
                    AcceptedAnswers = new List<QuestionAcceptedAnswer>
                    {
                        new() { AnswerText = "0" },
                        new() { AnswerText = "không" },
                        new() { AnswerText = "zero" }
                    }
                }
            };

            await context.Questions.AddRangeAsync(questions);
            await context.SaveChangesAsync();
        }
    }
}
