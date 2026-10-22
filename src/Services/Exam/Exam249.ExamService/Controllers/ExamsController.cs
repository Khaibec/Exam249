using System.Security.Claims;
using Exam249.ExamService.Data;
using Exam249.ExamService.Entities;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Exam249.ExamService.Services;

namespace Exam249.ExamService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExamsController : ControllerBase
{
    private readonly ExamDbContext _context;
    private readonly AntiCheatClient _antiCheatClient;
    private readonly ClassroomClient _classroomClient;

    public ExamsController(
        ExamDbContext context,
        AntiCheatClient antiCheatClient,
        ClassroomClient classroomClient)
    {
        _context = context;
        _antiCheatClient = antiCheatClient;
        _classroomClient = classroomClient;
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

        var exam = new Exam
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            SubjectId = request.SubjectId,
            ClassroomId = request.ClassroomId,
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
            Status = ExamStatus.Published,
            CreatedAtUtc = DateTime.UtcNow
        };

        int idx = 1;
        foreach (var q in request.Questions)
        {
            exam.Questions.Add(new ExamQuestion
            {
                QuestionId = q.QuestionId,
                Points = q.Points,
                OrderIndex = q.OrderIndex > 0 ? q.OrderIndex : idx++,
                Content = "Nội dung câu hỏi",
                Type = QuestionType.SingleChoice,
                Difficulty = DifficultyLevel.Medium
            });
        }

        await _context.Exams.AddAsync(exam);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<ExamDto>.Ok(new ExamDto
        {
            Id = exam.Id,
            Title = exam.Title,
            Description = exam.Description,
            SubjectId = exam.SubjectId,
            ClassroomId = exam.ClassroomId,
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
        var exam = await _context.Exams.Include(e => e.Questions).FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        if (exam == null)
            return NotFound(ApiResponse.Fail("Không tìm thấy kỳ thi."));

        exam.Title = request.Title.Trim();
        exam.Description = request.Description?.Trim() ?? string.Empty;
        exam.SubjectId = request.SubjectId;
        exam.ClassroomId = request.ClassroomId;
        exam.StartTimeUtc = request.StartTimeUtc;
        exam.EndTimeUtc = request.EndTimeUtc;
        exam.DurationMinutes = request.DurationMinutes;
        exam.PassingScore = request.PassingScore;
        exam.MaxAttempts = request.MaxAttempts;
        exam.ShuffleQuestions = request.ShuffleQuestions;
        exam.ShuffleOptions = request.ShuffleOptions;
        exam.ShowResultsImmediately = request.ShowResultsImmediately;
        exam.AllowReview = request.AllowReview;
        exam.Status = request.Status;
        exam.UpdatedAtUtc = DateTime.UtcNow;

        _context.ExamQuestions.RemoveRange(exam.Questions);
        int idx = 1;
        foreach (var q in request.Questions)
        {
            exam.Questions.Add(new ExamQuestion
            {
                ExamId = exam.Id,
                QuestionId = q.QuestionId,
                Points = q.Points,
                OrderIndex = q.OrderIndex > 0 ? q.OrderIndex : idx++,
                Content = "Nội dung câu hỏi",
                Type = QuestionType.SingleChoice,
                Difficulty = DifficultyLevel.Medium
            });
        }

        await _context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Cập nhật đề thi thành công."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse>> DeleteExam(Guid id)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null)
            return NotFound(ApiResponse.Fail("Không tìm thấy kỳ thi."));

        exam.IsDeleted = true;
        exam.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Xóa đề thi thành công."));
    }

    [HttpGet("{id:guid}/submissions")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<List<TeacherExamSubmissionListItemDto>>>> GetSubmissions(Guid id)
    {
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
}
