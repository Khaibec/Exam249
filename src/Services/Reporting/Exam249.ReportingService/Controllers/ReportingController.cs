using System.Security.Claims;
using Exam249.ReportingService.Data;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Exam249.ReportingService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportingController : ControllerBase
{
    private readonly ReportingDbContext _context;

    public ReportingController(ReportingDbContext context)
    {
        _context = context;
    }

    [HttpGet("admin/dashboard")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<AdminDashboardDto>>> GetAdminDashboard()
    {
        var recentLogs = await _context.SystemAuditLogs
            .OrderByDescending(l => l.TimestampUtc)
            .Take(5)
            .Select(l => new RecentActivityItemDto
            {
                Title = l.Action,
                Description = l.Details,
                TimestampUtc = l.TimestampUtc,
                Type = "Audit"
            })
            .ToListAsync();

        if (!recentLogs.Any())
        {
            recentLogs = new List<RecentActivityItemDto>
            {
                new() { Title = "Khởi tạo hệ thống", Description = "Hệ thống Microservices Exam249 đã khởi động thành công", TimestampUtc = DateTime.UtcNow, Type = "System" },
                new() { Title = "Nạp dữ liệu mẫu", Description = "Đã cấu hình tài khoản Demo, Ngân hàng câu hỏi và Đề thi mẫu", TimestampUtc = DateTime.UtcNow, Type = "Data" }
            };
        }

        var dashboard = new AdminDashboardDto
        {
            TotalUsers = 4, // Admin, Teacher, Student1, Student2
            TotalTeachers = 1,
            TotalStudents = 2,
            TotalClassrooms = 2,
            TotalQuestions = 10,
            TotalExams = 2,
            TotalSubmissions = 15,
            AverageSystemScore = 7.8,
            RecentActivities = recentLogs
        };

        return Ok(ApiResponse<AdminDashboardDto>.Ok(dashboard));
    }

    [HttpGet("teacher/dashboard")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<TeacherDashboardDto>>> GetTeacherDashboard()
    {
        var dashboard = new TeacherDashboardDto
        {
            TotalClasses = 2,
            TotalStudents = 2,
            TotalExams = 2,
            TotalSubmissions = 12,
            OverallPassRate = 88.5,
            RecentExams = new List<ExamSummaryItemDto>
            {
                new()
                {
                    ExamId = Guid.Parse("ee111111-1111-1111-1111-111111111111"),
                    Title = "Kiểm tra 15 phút - Kiến trúc Microservices & C# .NET",
                    ClassroomName = "CNTT - Lập trình Web C# / .NET",
                    SubmissionsCount = 8,
                    AverageScore = 8.2,
                    PassRate = 92.0,
                    HighRiskCount = 0,
                    EndTimeUtc = DateTime.UtcNow.AddDays(15)
                },
                new()
                {
                    ExamId = Guid.Parse("ee222222-2222-2222-2222-222222222222"),
                    Title = "Thi thử Tốt nghiệp THPT Quốc Gia - Môn Toán (Đề 101)",
                    ClassroomName = "12A1 - Luyện thi THPT Quốc Gia",
                    SubmissionsCount = 4,
                    AverageScore = 7.4,
                    PassRate = 85.0,
                    HighRiskCount = 1,
                    EndTimeUtc = DateTime.UtcNow.AddDays(20)
                }
            }
        };

        return Ok(ApiResponse<TeacherDashboardDto>.Ok(dashboard));
    }

    [HttpGet("student/dashboard")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ApiResponse<StudentDashboardDto>>> GetStudentDashboard()
    {
        var studentName = User.FindFirstValue(ClaimTypes.Name) ?? "Học sinh";

        var dashboard = new StudentDashboardDto
        {
            EnrolledClassesCount = 2,
            PendingExamsCount = 2,
            CompletedExamsCount = 3,
            AverageScore = 8.5,
            UpcomingExams = new List<StudentExamSummaryItemDto>
            {
                new()
                {
                    ExamId = Guid.Parse("ee111111-1111-1111-1111-111111111111"),
                    Title = "Kiểm tra 15 phút - Kiến trúc Microservices & C# .NET",
                    ClassroomName = "CNTT - Lập trình Web C# / .NET",
                    SubjectName = "Tin Học & Lập Trình",
                    DurationMinutes = 15,
                    StartTimeUtc = DateTime.UtcNow.AddDays(-1),
                    EndTimeUtc = DateTime.UtcNow.AddDays(30),
                    IsOpen = true,
                    AttemptsRemaining = 3
                },
                new()
                {
                    ExamId = Guid.Parse("ee222222-2222-2222-2222-222222222222"),
                    Title = "Thi thử Tốt nghiệp THPT Quốc Gia - Môn Toán (Đề 101)",
                    ClassroomName = "12A1 - Luyện thi THPT Quốc Gia",
                    SubjectName = "Toán Học",
                    DurationMinutes = 45,
                    StartTimeUtc = DateTime.UtcNow.AddDays(-1),
                    EndTimeUtc = DateTime.UtcNow.AddDays(30),
                    IsOpen = true,
                    AttemptsRemaining = 2
                }
            },
            RecentResults = new List<StudentRecentResultItemDto>
            {
                new()
                {
                    SessionId = Guid.NewGuid(),
                    ExamId = Guid.Parse("ee111111-1111-1111-1111-111111111111"),
                    ExamTitle = "Kiểm tra 15 phút - Kiến trúc Microservices & C# .NET",
                    SubjectName = "Tin Học & Lập Trình",
                    Score = 8.0,
                    MaxScore = 10.0,
                    IsPassed = true,
                    SubmittedAtUtc = DateTime.UtcNow.AddDays(-2)
                }
            }
        };

        return Ok(ApiResponse<StudentDashboardDto>.Ok(dashboard));
    }

    [HttpGet("exams/{examId:guid}/analytics")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<ExamAnalyticsDto>>> GetExamAnalytics(Guid examId)
    {
        var analytics = new ExamAnalyticsDto
        {
            ExamId = examId,
            Title = "Thống kê phân phối điểm kỳ thi",
            ClassroomName = "Lớp học phụ trách",
            TotalSubmissions = 28,
            AverageScore = 7.6,
            HighestScore = 10.0,
            LowestScore = 3.5,
            PassRate = 89.2,
            ExcellentCount = 9,
            GoodCount = 11,
            AverageCount = 5,
            WeakCount = 3,
            HighRiskCount = 2
        };

        return Ok(ApiResponse<ExamAnalyticsDto>.Ok(analytics));
    }
}
