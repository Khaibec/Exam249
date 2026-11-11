using System.Security.Claims;
using Exam249.ExamService.Data;
using Exam249.ExamService.Entities;
using Exam249.ExamService.Services;
using Exam249.Shared.Common.Security;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Exam249.ExamService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExamsController : ControllerBase
{
    private readonly ExamDbContext _context;
    private readonly AntiCheatClient _antiCheatClient;
    private readonly ClassroomClient _classroomClient;
    private readonly QuestionBankClient _bankClient;
    private readonly IConfiguration _configuration;

    public ExamsController(
        ExamDbContext context,
        AntiCheatClient antiCheatClient,
        ClassroomClient classroomClient,
        QuestionBankClient bankClient,
        IConfiguration configuration)
    {
        _context = context;
        _antiCheatClient = antiCheatClient;
        _classroomClient = classroomClient;
        _bankClient = bankClient;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ExamDto>>>> GetExams([FromQuery] Guid? classroomId = null)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(userIdStr, out var userId);

        var query = _context.Exams
            .Include(e => e.Questions)
            .Where(e => !e.IsDeleted);

        if (role == "Teacher")
        {
            query = query.Where(e => e.TeacherId == userId);
        }
        else if (role == "Student")
        {
            var enrolledClassIds = await _classroomClient.GetStudentEnrolledClassroomIdsAsync(userId);
            query = query.Where(e => enrolledClassIds.Contains(e.ClassroomId));
        }

        if (classroomId.HasValue)
        {
            query = query.Where(e => e.ClassroomId == classroomId.Value);
        }

        var list = await query
            .OrderByDescending(e => e.CreatedAtUtc)
            .Select(e => new ExamDto
            {
                Id = e.Id,
                Title = e.Title,
                Description = e.Description,
                SubjectId = e.SubjectId,
                SubjectName = e.SubjectName,
                ClassroomId = e.ClassroomId,
                ClassroomName = e.ClassroomName,
                TeacherId = e.TeacherId,
                TeacherName = e.TeacherName,
                StartTimeUtc = e.StartTimeUtc,
                EndTimeUtc = e.EndTimeUtc,
                DurationMinutes = e.DurationMinutes,
                PassingScore = e.PassingScore,
                MaxAttempts = e.MaxAttempts,
                ShuffleQuestions = e.ShuffleQuestions,
                ShuffleOptions = e.ShuffleOptions,
                ShowResultsImmediately = e.ShowResultsImmediately,
                AllowReview = e.AllowReview,
                RequireWebcam = e.RequireWebcam,
                Status = e.Status,
                QuestionCount = e.Questions.Count,
                TotalPoints = e.Questions.Sum(q => q.Points),
                CreatedAtUtc = e.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(ApiResponse<List<ExamDto>>.Ok(list));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ExamDto>>> GetExamById(Guid id)
    {
        var e = await _context.Exams
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (e == null)
            return NotFound(ApiResponse<ExamDto>.Fail("Không tìm thấy kỳ thi."));

        var dto = new ExamDto
        {
            Id = e.Id,
            Title = e.Title,
            Description = e.Description,
            SubjectId = e.SubjectId,
            SubjectName = e.SubjectName,
            ClassroomId = e.ClassroomId,
            ClassroomName = e.ClassroomName,
            TeacherId = e.TeacherId,
            TeacherName = e.TeacherName,
            StartTimeUtc = e.StartTimeUtc,
            EndTimeUtc = e.EndTimeUtc,
            DurationMinutes = e.DurationMinutes,
            PassingScore = e.PassingScore,
            MaxAttempts = e.MaxAttempts,
            ShuffleQuestions = e.ShuffleQuestions,
            ShuffleOptions = e.ShuffleOptions,
            ShowResultsImmediately = e.ShowResultsImmediately,
            AllowReview = e.AllowReview,
            RequireWebcam = e.RequireWebcam,
            Status = e.Status,
            QuestionCount = e.Questions.Count,
            TotalPoints = e.Questions.Sum(q => q.Points),
            CreatedAtUtc = e.CreatedAtUtc,
            Questions = e.Questions.OrderBy(q => q.OrderIndex).Select(q => new ExamQuestionItemDto
            {
                QuestionId = q.QuestionId,
                Content = q.Content,
                Type = q.Type,
                Difficulty = q.Difficulty,
                Points = q.Points,
                OrderIndex = q.OrderIndex
            }).ToList()
        };

        return Ok(ApiResponse<ExamDto>.Ok(dto));
    }

    [HttpPost]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<ExamDto>>> CreateExam([FromBody] CreateExamRequest request)
    {
        var teacherIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var teacherName = User.FindFirstValue(ClaimTypes.Name) ?? "Giáo viên";
        Guid.TryParse(teacherIdStr, out var teacherId);

        var classroom = await _classroomClient.GetClassroomAsync(request.ClassroomId);
        var subject = await _classroomClient.GetSubjectAsync(request.SubjectId);

        var exam = new Exam
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            SubjectId = request.SubjectId,
            SubjectName = subject?.Name ?? classroom?.SubjectName ?? "Môn học",
            ClassroomId = request.ClassroomId,
            ClassroomName = classroom?.Name ?? "Lớp học",
            TeacherId = teacherId,
            TeacherName = teacherName,
            StartTimeUtc = request.StartTimeUtc,
            EndTimeUtc = request.EndTimeUtc,
            DurationMinutes = request.DurationMinutes,
            PassingScore = request.PassingScore,
            MaxAttempts = request.MaxAttempts,
            ShuffleQuestions = request.ShuffleQuestions,
            ShuffleOptions = request.ShuffleOptions,
            ShowResultsImmediately = request.ShowResultsImmediately,
            AllowReview = request.AllowReview,
            RequireWebcam = request.RequireWebcam,
            Status = ExamStatus.Published,
            CreatedAtUtc = DateTime.UtcNow
        };

        var examQuestions = await BuildExamQuestionsAsync(request.Questions);
        foreach (var eq in examQuestions)
        {
            exam.Questions.Add(eq);
        }

        await _context.Exams.AddAsync(exam);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<ExamDto>.Ok(new ExamDto
        {
            Id = exam.Id,
            Title = exam.Title,
            Description = exam.Description,
            SubjectId = exam.SubjectId,
            SubjectName = exam.SubjectName,
            ClassroomId = exam.ClassroomId,
            ClassroomName = exam.ClassroomName,
            TeacherId = exam.TeacherId,
            TeacherName = exam.TeacherName,
            StartTimeUtc = exam.StartTimeUtc,
            EndTimeUtc = exam.EndTimeUtc,
            DurationMinutes = exam.DurationMinutes,
            PassingScore = exam.PassingScore,
            MaxAttempts = exam.MaxAttempts,
            ShuffleQuestions = exam.ShuffleQuestions,
            ShuffleOptions = exam.ShuffleOptions,
            ShowResultsImmediately = exam.ShowResultsImmediately,
            AllowReview = exam.AllowReview,
            RequireWebcam = exam.RequireWebcam,
            Status = exam.Status,
            QuestionCount = exam.Questions.Count,
            TotalPoints = exam.Questions.Sum(q => q.Points),
            CreatedAtUtc = exam.CreatedAtUtc
        }, "Tạo đề thi thành công!"));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse>> UpdateExam(Guid id, [FromBody] UpdateExamRequest request)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(userIdStr, out var userId);

        var exam = await _context.Exams.Include(e => e.Questions).FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        if (exam == null)
            return NotFound(ApiResponse.Fail("Không tìm thấy kỳ thi."));

        if (role == "Teacher" && exam.TeacherId != userId)
            return Forbid();

        var classroom = await _classroomClient.GetClassroomAsync(request.ClassroomId);
        var subject = await _classroomClient.GetSubjectAsync(request.SubjectId);

        exam.Title = request.Title.Trim();
        exam.Description = request.Description?.Trim() ?? string.Empty;
        exam.SubjectId = request.SubjectId;
        exam.SubjectName = subject?.Name ?? classroom?.SubjectName ?? exam.SubjectName;
        exam.ClassroomId = request.ClassroomId;
        exam.ClassroomName = classroom?.Name ?? exam.ClassroomName;
        exam.StartTimeUtc = request.StartTimeUtc;
        exam.EndTimeUtc = request.EndTimeUtc;
        exam.DurationMinutes = request.DurationMinutes;
        exam.PassingScore = request.PassingScore;
        exam.MaxAttempts = request.MaxAttempts;
        exam.ShuffleQuestions = request.ShuffleQuestions;
        exam.ShuffleOptions = request.ShuffleOptions;
        exam.ShowResultsImmediately = request.ShowResultsImmediately;
        exam.AllowReview = request.AllowReview;
        exam.RequireWebcam = request.RequireWebcam;
        exam.Status = request.Status;
        exam.UpdatedAtUtc = DateTime.UtcNow;

        _context.ExamQuestions.RemoveRange(exam.Questions);
        var updatedQuestions = await BuildExamQuestionsAsync(request.Questions, exam.Id);
        foreach (var eq in updatedQuestions)
        {
            exam.Questions.Add(eq);
        }

        await _context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Cập nhật đề thi thành công."));
    }

    private async Task<List<ExamQuestion>> BuildExamQuestionsAsync(List<CreateExamQuestionItemRequest> items, Guid? examId = null)
    {
        var qIds = items.Select(i => i.QuestionId).Distinct().ToList();
        var bankQuestions = qIds.Any() ? await _bankClient.BatchGetQuestionsAsync(qIds) : new List<QuestionDto>();
        var bankLookup = bankQuestions.ToDictionary(q => q.Id);

        var result = new List<ExamQuestion>();
        int idx = 1;
        foreach (var q in items)
        {
            bankLookup.TryGetValue(q.QuestionId, out var bq);
            var eq = new ExamQuestion
            {
                QuestionId = q.QuestionId,
                Points = q.Points > 0 ? q.Points : (bq?.DefaultPoints ?? 1.0),
                OrderIndex = q.OrderIndex > 0 ? q.OrderIndex : idx++,
                Content = bq?.Content ?? "Nội dung câu hỏi",
                ImageUrl = bq?.ImageUrl,
                Type = bq?.Type ?? QuestionType.SingleChoice,
                Difficulty = bq?.Difficulty ?? DifficultyLevel.Medium
            };
            if (examId.HasValue)
            {
                eq.ExamId = examId.Value;
            }
            result.Add(eq);
        }

        return result;
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse>> DeleteExam(Guid id)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(userIdStr, out var userId);

        var exam = await _context.Exams.FindAsync(id);
        if (exam == null)
            return NotFound(ApiResponse.Fail("Không tìm thấy kỳ thi."));

        if (role == "Teacher" && exam.TeacherId != userId)
            return Forbid();

        exam.IsDeleted = true;
        exam.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Xóa đề thi thành công."));
    }

    [HttpGet("{id:guid}/submissions")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<List<TeacherExamSubmissionListItemDto>>>> GetSubmissions(Guid id)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(userIdStr, out var userId);

        var exam = await _context.Exams.FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        if (exam == null)
            return NotFound(ApiResponse<List<TeacherExamSubmissionListItemDto>>.Fail("Không tìm thấy kỳ thi."));

        if (role == "Teacher" && exam.TeacherId != userId)
            return Forbid();

        var submissions = await _context.ExamSubmissions
            .Include(s => s.ExamSession)
            .Where(s => s.ExamId == id)
            .OrderByDescending(s => s.SubmittedAtUtc)
            .Select(s => new TeacherExamSubmissionListItemDto
            {
                SessionId = s.ExamSessionId,
                StudentId = s.StudentId,
                StudentName = s.StudentName,
                StudentEmail = s.ExamSession.StudentEmail,
                StartedAtUtc = s.StartedAtUtc,
                SubmittedAtUtc = s.SubmittedAtUtc,
                DurationSeconds = s.DurationSeconds,
                TotalScore = s.TotalScore,
                MaxScore = s.MaxScore,
                ScorePercentage = s.ScorePercentage,
                IsPassed = s.IsPassed,
                RiskScore = s.RiskScore,
                RiskLevel = s.RiskLevel,
                ViolationsCount = 0
            })
            .ToListAsync();

        // Enrich with real-time Anti-Cheat risk metrics and violation counts
        var sessionIds = submissions.Select(s => s.SessionId).ToList();
        if (sessionIds.Any())
        {
            var summaries = await _antiCheatClient.GetBatchSessionSummariesAsync(sessionIds);
            var summaryMap = summaries.ToDictionary(s => s.SessionId);

            foreach (var sub in submissions)
            {
                if (summaryMap.TryGetValue(sub.SessionId, out var risk))
                {
                    sub.RiskScore = risk.TotalRiskScore;
                    sub.RiskLevel = risk.RiskLevel;
                    sub.ViolationsCount = risk.ViolationsCount;
                }
            }
        }

        return Ok(ApiResponse<List<TeacherExamSubmissionListItemDto>>.Ok(submissions));
    }

    [HttpGet("internal/overview")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<ExamOverviewStatsDto>>> GetInternalOverview([FromQuery] Guid? teacherId = null)
    {
        if (!InternalSecurityConstants.IsValidInternalRequest(Request, _configuration))
            return Forbid();

        var examsQuery = _context.Exams.Where(e => !e.IsDeleted);
        if (teacherId.HasValue)
        {
            examsQuery = examsQuery.Where(e => e.TeacherId == teacherId.Value);
        }

        var exams = await examsQuery
            .OrderByDescending(e => e.CreatedAtUtc)
            .ToListAsync();

        var examIds = exams.Select(e => e.Id).ToList();
        var submissions = await _context.ExamSubmissions
            .Where(s => examIds.Contains(s.ExamId))
            .ToListAsync();

        // Enrich with live AntiCheat risk scores for accurate HighRiskCount
        var sessionIds = submissions.Select(s => s.ExamSessionId).ToList();
        var riskMap = new Dictionary<Guid, RiskScoreSummaryDto>();
        if (sessionIds.Any())
        {
            var summaries = await _antiCheatClient.GetBatchSessionSummariesAsync(sessionIds);
            riskMap = summaries.ToDictionary(s => s.SessionId);
        }

        var recentExams = exams.Take(10).Select(e =>
        {
            var exSubs = submissions.Where(s => s.ExamId == e.Id).ToList();
            var avg = exSubs.Any() ? Math.Round(exSubs.Average(s => s.TotalScore), 1) : 0.0;
            var passRate = exSubs.Any() ? Math.Round((double)exSubs.Count(s => s.IsPassed) / exSubs.Count * 100.0, 1) : 0.0;
            var highRisk = exSubs.Count(s =>
            {
                var level = riskMap.TryGetValue(s.ExamSessionId, out var r) ? r.RiskLevel : s.RiskLevel;
                return level >= RiskLevel.HighRisk;
            });

            return new ExamSummaryItemDto
            {
                ExamId = e.Id,
                Title = e.Title,
                ClassroomName = e.ClassroomName,
                SubmissionsCount = exSubs.Count,
                AverageScore = avg,
                PassRate = passRate,
                HighRiskCount = highRisk,
                EndTimeUtc = e.EndTimeUtc
            };
        }).ToList();

        var overview = new ExamOverviewStatsDto
        {
            TotalExams = exams.Count,
            TotalSubmissions = submissions.Count,
            AverageScore = submissions.Any() ? Math.Round(submissions.Average(s => s.TotalScore), 1) : 0.0,
            OverallPassRate = submissions.Any() ? Math.Round((double)submissions.Count(s => s.IsPassed) / submissions.Count * 100.0, 1) : 0.0,
            RecentExams = recentExams
        };

        return Ok(ApiResponse<ExamOverviewStatsDto>.Ok(overview));
    }

    [HttpGet("internal/student-overview")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<StudentExamOverviewDto>>> GetInternalStudentOverview([FromQuery] Guid studentId)
    {
        if (!InternalSecurityConstants.IsValidInternalRequest(Request, _configuration))
            return Forbid();

        var enrolledClassIds = await _classroomClient.GetStudentEnrolledClassroomIdsAsync(studentId);
        var now = DateTime.UtcNow;

        var openExams = await _context.Exams
            .Where(e => !e.IsDeleted && e.Status == ExamStatus.Published && enrolledClassIds.Contains(e.ClassroomId) && e.EndTimeUtc >= now)
            .OrderBy(e => e.EndTimeUtc)
            .ToListAsync();

        var studentSessions = await _context.ExamSessions
            .Where(s => s.StudentId == studentId)
            .ToListAsync();

        var upcomingItems = openExams.Select(e =>
        {
            var usedAttempts = studentSessions.Count(s =>
                s.ExamId == e.Id &&
                (s.Status == SessionStatus.Submitted || s.Status == SessionStatus.Disqualified));
            var remaining = Math.Max(0, e.MaxAttempts - usedAttempts);

            return new StudentExamSummaryItemDto
            {
                ExamId = e.Id,
                Title = e.Title,
                ClassroomName = e.ClassroomName,
                SubjectName = e.SubjectName,
                DurationMinutes = e.DurationMinutes,
                StartTimeUtc = e.StartTimeUtc,
                EndTimeUtc = e.EndTimeUtc,
                IsOpen = e.StartTimeUtc <= now && e.EndTimeUtc >= now,
                AttemptsRemaining = remaining
            };
        })
        .Where(x => x.AttemptsRemaining > 0)
        .ToList();

        var submissions = await _context.ExamSubmissions
            .Include(s => s.ExamSession)
                .ThenInclude(es => es.Exam)
            .Where(s => s.StudentId == studentId)
            .OrderByDescending(s => s.SubmittedAtUtc)
            .ToListAsync();

        var recentResults = submissions.Take(10).Select(s => new StudentRecentResultItemDto
        {
            SessionId = s.ExamSessionId,
            ExamId = s.ExamId,
            ExamTitle = s.ExamSession.Exam.Title,
            SubjectName = s.ExamSession.Exam.SubjectName,
            Score = s.TotalScore,
            MaxScore = s.MaxScore,
            IsPassed = s.IsPassed,
            SubmittedAtUtc = s.SubmittedAtUtc
        }).ToList();

        var dto = new StudentExamOverviewDto
        {
            PendingExamsCount = upcomingItems.Count,
            CompletedExamsCount = submissions.Count,
            AverageScore = submissions.Any() ? Math.Round(submissions.Average(s => s.TotalScore), 1) : 0.0,
            UpcomingExams = upcomingItems,
            RecentResults = recentResults
        };

        return Ok(ApiResponse<StudentExamOverviewDto>.Ok(dto));
    }

    [HttpGet("internal/{examId:guid}/analytics")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<ExamAnalyticsDto>>> GetInternalExamAnalytics(Guid examId)
    {
        if (!InternalSecurityConstants.IsValidInternalRequest(Request, _configuration))
            return Forbid();

        var exam = await _context.Exams.FirstOrDefaultAsync(e => e.Id == examId && !e.IsDeleted);
        if (exam == null)
            return NotFound(ApiResponse<ExamAnalyticsDto>.Fail("Không tìm thấy kỳ thi."));

        var submissions = await _context.ExamSubmissions
            .Where(s => s.ExamId == examId)
            .ToListAsync();

        var sessionIds = submissions.Select(s => s.ExamSessionId).ToList();
        var riskMap = new Dictionary<Guid, RiskScoreSummaryDto>();
        if (sessionIds.Any())
        {
            var summaries = await _antiCheatClient.GetBatchSessionSummariesAsync(sessionIds);
            riskMap = summaries.ToDictionary(s => s.SessionId);
        }

        int excellent = 0, good = 0, average = 0, weak = 0, highRisk = 0;
        foreach (var s in submissions)
        {
            var scale10 = s.MaxScore > 0 ? (s.TotalScore / s.MaxScore) * 10.0 : 0.0;
            if (scale10 >= 8.5) excellent++;
            else if (scale10 >= 7.0) good++;
            else if (scale10 >= 5.0) average++;
            else weak++;

            var level = riskMap.TryGetValue(s.ExamSessionId, out var r) ? r.RiskLevel : s.RiskLevel;
            if (level >= RiskLevel.HighRisk) highRisk++;
        }

        var analytics = new ExamAnalyticsDto
        {
            ExamId = exam.Id,
            Title = exam.Title,
            ClassroomName = exam.ClassroomName,
            TotalSubmissions = submissions.Count,
            AverageScore = submissions.Any() ? Math.Round(submissions.Average(s => s.TotalScore), 2) : 0.0,
            HighestScore = submissions.Any() ? submissions.Max(s => s.TotalScore) : 0.0,
            LowestScore = submissions.Any() ? submissions.Min(s => s.TotalScore) : 0.0,
            PassRate = submissions.Any() ? Math.Round((double)submissions.Count(s => s.IsPassed) / submissions.Count * 100.0, 1) : 0.0,
            ExcellentCount = excellent,
            GoodCount = good,
            AverageCount = average,
            WeakCount = weak,
            HighRiskCount = highRisk
        };

        return Ok(ApiResponse<ExamAnalyticsDto>.Ok(analytics));
    }
}
