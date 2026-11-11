using System.Security.Claims;
using Exam249.ReportingService.Data;
using Exam249.ReportingService.Services;
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
    private readonly ReportingAggregationClient _aggClient;

    public ReportingController(ReportingDbContext context, ReportingAggregationClient aggClient)
    {
        _context = context;
        _aggClient = aggClient;
    }

    [HttpGet("admin/dashboard")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<AdminDashboardDto>>> GetAdminDashboard()
    {
        var logsTask = _context.SystemAuditLogs
            .OrderByDescending(l => l.TimestampUtc)
            .Take(8)
            .Select(l => new RecentActivityItemDto
            {
                Title = l.Action,
                Description = l.Details,
                TimestampUtc = l.TimestampUtc,
                Type = "Audit"
            })
            .ToListAsync();

        var identityTask = _aggClient.GetIdentityStatsAsync();
        var classroomTask = _aggClient.GetClassroomStatsAsync();
        var questionsTask = _aggClient.GetQuestionsCountAsync();
        var examTask = _aggClient.GetExamOverviewAsync();

        await Task.WhenAll(logsTask, identityTask, classroomTask, questionsTask, examTask);

        var recentLogs = logsTask.Result;
        if (!recentLogs.Any())
        {
            recentLogs = new List<RecentActivityItemDto>
            {
                new() { Title = "Hệ thống sẵn sàng", Description = "Chưa có lượt nộp bài nào được ghi nhận qua Event Bus.", TimestampUtc = DateTime.UtcNow, Type = "System" }
            };
        }

        var identityStats = identityTask.Result;
        var classroomStats = classroomTask.Result;
        var examStats = examTask.Result;

        var dashboard = new AdminDashboardDto
        {
            TotalUsers = identityStats?.TotalUsers ?? 0,
            TotalTeachers = identityStats?.TotalTeachers ?? 0,
            TotalStudents = identityStats?.TotalStudents ?? 0,
            TotalClassrooms = classroomStats?.TotalClassrooms ?? 0,
            TotalQuestions = questionsTask.Result,
            TotalExams = examStats?.TotalExams ?? 0,
            TotalSubmissions = examStats?.TotalSubmissions ?? 0,
            AverageSystemScore = examStats?.AverageScore ?? 0.0,
            RecentActivities = recentLogs
        };

        return Ok(ApiResponse<AdminDashboardDto>.Ok(dashboard));
    }

    [HttpGet("teacher/dashboard")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<TeacherDashboardDto>>> GetTeacherDashboard()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(userIdStr, out var userId);

        Guid? teacherFilter = role == "Teacher" ? userId : null;

        var classroomTask = _aggClient.GetClassroomStatsAsync(teacherFilter);
        var examTask = _aggClient.GetExamOverviewAsync(teacherFilter);

        await Task.WhenAll(classroomTask, examTask);

        var classroomStats = classroomTask.Result;
        var examStats = examTask.Result;

        var dashboard = new TeacherDashboardDto
        {
            TotalClasses = classroomStats?.TotalClassrooms ?? 0,
            TotalStudents = classroomStats?.TotalStudents ?? 0,
            TotalExams = examStats?.TotalExams ?? 0,
            TotalSubmissions = examStats?.TotalSubmissions ?? 0,
            OverallPassRate = examStats?.OverallPassRate ?? 0.0,
            RecentExams = examStats?.RecentExams ?? new List<ExamSummaryItemDto>()
        };

        return Ok(ApiResponse<TeacherDashboardDto>.Ok(dashboard));
    }

    [HttpGet("student/dashboard")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ApiResponse<StudentDashboardDto>>> GetStudentDashboard()
    {
        var studentIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(studentIdStr, out var studentId))
            return Unauthorized(ApiResponse<StudentDashboardDto>.Fail("Không thể xác định học sinh."));

        var classesTask = _aggClient.GetStudentClassroomIdsAsync(studentId);
        var examOverviewTask = _aggClient.GetStudentExamOverviewAsync(studentId);

        await Task.WhenAll(classesTask, examOverviewTask);

        var enrolledClasses = classesTask.Result ?? new List<Guid>();
        var examOverview = examOverviewTask.Result;

        var dashboard = new StudentDashboardDto
        {
            EnrolledClassesCount = enrolledClasses.Count,
            PendingExamsCount = examOverview?.PendingExamsCount ?? 0,
            CompletedExamsCount = examOverview?.CompletedExamsCount ?? 0,
            AverageScore = examOverview?.AverageScore ?? 0.0,
            UpcomingExams = examOverview?.UpcomingExams ?? new List<StudentExamSummaryItemDto>(),
            RecentResults = examOverview?.RecentResults ?? new List<StudentRecentResultItemDto>()
        };

        return Ok(ApiResponse<StudentDashboardDto>.Ok(dashboard));
    }

    [HttpGet("exams/{examId:guid}/analytics")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<ExamAnalyticsDto>>> GetExamAnalytics(Guid examId)
    {
        var analytics = await _aggClient.GetExamAnalyticsAsync(examId);
        if (analytics == null)
            return NotFound(ApiResponse<ExamAnalyticsDto>.Fail("Không tìm thấy dữ liệu phân tích cho kỳ thi này."));

        return Ok(ApiResponse<ExamAnalyticsDto>.Ok(analytics));
    }
}
