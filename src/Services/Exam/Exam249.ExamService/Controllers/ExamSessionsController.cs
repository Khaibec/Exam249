using System.Security.Claims;
using System.Text.Json;
using Exam249.ExamService.Data;
using Exam249.ExamService.Entities;
using Exam249.ExamService.Services;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;
using Exam249.Shared.Contracts.Events;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Exam249.ExamService.Controllers;

[ApiController]
[Route("api/exams")]
[Authorize]
public class ExamSessionsController : ControllerBase
{
    private readonly ExamDbContext _context;
    private readonly QuestionBankClient _bankClient;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<ExamSessionsController> _logger;

    public ExamSessionsController(
        ExamDbContext context,
        QuestionBankClient bankClient,
        IPublishEndpoint publishEndpoint,
        ILogger<ExamSessionsController> logger)
    {
        _context = context;
        _bankClient = bankClient;
        _publishEndpoint = publishEndpoint;
        _logger = logger;
    }

    [HttpPost("{id:guid}/start-session")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ApiResponse<StudentExamViewDto>>> StartSession(Guid id)
    {
        var studentIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var studentName = User.FindFirstValue(ClaimTypes.Name) ?? "Học sinh";
        var studentEmail = User.FindFirstValue(ClaimTypes.Email) ?? "";
        Guid.TryParse(studentIdStr, out var studentId);

        var exam = await _context.Exams
            .Include(e => e.Questions)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

        if (exam == null)
            return NotFound(ApiResponse<StudentExamViewDto>.Fail("Không tìm thấy đề thi."));

        if (exam.Status != ExamStatus.Published)
            return BadRequest(ApiResponse<StudentExamViewDto>.Fail("Kỳ thi hiện chưa được mở."));

        var now = DateTime.UtcNow;
        if (now < exam.StartTimeUtc)
            return BadRequest(ApiResponse<StudentExamViewDto>.Fail($"Kỳ thi chưa bắt đầu. Thời gian mở thi: {exam.StartTimeUtc:dd/MM/yyyy HH:mm}"));

        if (now > exam.EndTimeUtc)
            return BadRequest(ApiResponse<StudentExamViewDto>.Fail("Kỳ thi đã kết thúc thời hạn làm bài."));

        // Check attempts
        var completedAttempts = await _context.ExamSessions
            .CountAsync(s => s.ExamId == id && s.StudentId == studentId && s.Status == SessionStatus.Submitted);

        if (completedAttempts >= exam.MaxAttempts)
            return BadRequest(ApiResponse<StudentExamViewDto>.Fail($"Bạn đã hoàn thành tối đa {exam.MaxAttempts} lần thi cho đề thi này."));

        // Check if there is an in-progress session
        var existingSession = await _context.ExamSessions
            .Include(s => s.CurrentAnswers)
            .FirstOrDefaultAsync(s => s.ExamId == id && s.StudentId == studentId && s.Status == SessionStatus.InProgress);

        ExamSession session;
        if (existingSession != null)
        {
            if (now > existingSession.DeadlineUtc.AddSeconds(30))
            {
                // Expired in-progress session, auto-close
                existingSession.Status = SessionStatus.TimedOut;
                await _context.SaveChangesAsync();
                return BadRequest(ApiResponse<StudentExamViewDto>.Fail("Phiên làm bài trước đó đã quá hạn thời gian quy định."));
            }
            session = existingSession;
        }
        else
        {
            var deadline = now.AddMinutes(exam.DurationMinutes);
            // Cap at Exam EndTime if sooner
            if (deadline > exam.EndTimeUtc)
                deadline = exam.EndTimeUtc;

            // Generate randomized variant code (e.g., 101, 102, 103, 104)
            var variantCode = (100 + new Random().Next(1, 10)).ToString();

            session = new ExamSession
            {
                ExamId = exam.Id,
                StudentId = studentId,
                StudentName = studentName,
                StudentEmail = studentEmail,
                StartedAtUtc = now,
                DeadlineUtc = deadline,
                Status = SessionStatus.InProgress,
                ExamVariantCode = variantCode,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            };

            await _context.ExamSessions.AddAsync(session);
            await _context.SaveChangesAsync();

            // Publish started event
            await _publishEndpoint.Publish(new ExamSessionStartedEvent(
                session.Id,
                exam.Id,
                studentId,
                studentName,
                now,
                deadline,
                session.IpAddress ?? "unknown",
                session.UserAgent ?? "unknown"));
        }

        // Fetch question details from QuestionBank
        var questionIds = exam.Questions.Select(q => q.QuestionId).ToList();
        var bankQuestions = await _bankClient.BatchGetQuestionsAsync(questionIds);
        var bankLookup = bankQuestions.ToDictionary(q => q.Id);

        // Prepare student questions (SECURE: NO IS_CORRECT, NO ACCEPTED_ANSWERS)
        var studentQuestions = new List<StudentQuestionDto>();
        int order = 1;

        // Shuffle questions deterministically based on session Guid seed if requested
        var questionsToProcess = exam.Questions.ToList();
        if (exam.ShuffleQuestions)
        {
            var rng = new Random(session.Id.GetHashCode());
            questionsToProcess = questionsToProcess.OrderBy(_ => rng.Next()).ToList();
        }
        else
        {
            questionsToProcess = questionsToProcess.OrderBy(q => q.OrderIndex).ToList();
        }

        foreach (var eq in questionsToProcess)
        {
            bankLookup.TryGetValue(eq.QuestionId, out var bq);
            var content = bq?.Content ?? eq.Content;
            var type = bq?.Type ?? eq.Type;
            var imageUrl = bq?.ImageUrl ?? eq.ImageUrl;

            var optionsDto = new List<StudentOptionDto>();
            if (bq != null && bq.Options.Any())
            {
                var opts = bq.Options.ToList();
                if (exam.ShuffleOptions)
                {
                    var optRng = new Random(session.Id.GetHashCode() + eq.QuestionId.GetHashCode());
                    opts = opts.OrderBy(_ => optRng.Next()).ToList();
                }
                else
                {
                    opts = opts.OrderBy(o => o.OrderIndex).ToList();
                }

                int optIdx = 1;
                foreach (var opt in opts)
                {
                    optionsDto.Add(new StudentOptionDto
                    {
                        Id = opt.Id,
                        Content = opt.Content,
                        OrderIndex = optIdx++
                    });
                }
            }

            studentQuestions.Add(new StudentQuestionDto
            {
                QuestionId = eq.QuestionId,
                OrderIndex = order++,
                Content = content,
                ImageUrl = imageUrl,
                Type = type,
                Points = eq.Points,
                Options = optionsDto
            });
        }

        // Prepare saved answers
        var currentAnswers = session.CurrentAnswers.Select(a => new StudentAnswerItemDto
        {
            QuestionId = a.QuestionId,
            SelectedOptionIds = string.IsNullOrEmpty(a.SelectedOptionIdsJson)
                ? new List<Guid>()
                : JsonSerializer.Deserialize<List<Guid>>(a.SelectedOptionIdsJson) ?? new List<Guid>(),
            TextAnswer = a.TextAnswer,
            IsFlagged = a.IsFlagged
        }).ToList();

        var remainingSeconds = Math.Max(0, (int)(session.DeadlineUtc - DateTime.UtcNow).TotalSeconds);

        var viewDto = new StudentExamViewDto
        {
            SessionId = session.Id,
            ExamId = exam.Id,
            ExamTitle = exam.Title,
            ClassroomName = exam.ClassroomName,
            DurationMinutes = exam.DurationMinutes,
            StartedAtUtc = session.StartedAtUtc,
            DeadlineUtc = session.DeadlineUtc,
            RemainingSeconds = remainingSeconds,
            ExamVariantCode = session.ExamVariantCode,
            Questions = studentQuestions,
            CurrentAnswers = currentAnswers
        };

        return Ok(ApiResponse<StudentExamViewDto>.Ok(viewDto, "Bắt đầu làm bài thi!"));
    }

    [HttpPost("sessions/{sessionId:guid}/autosave")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ApiResponse>> Autosave(Guid sessionId, [FromBody] AutosaveAnswersRequest request)
    {
        var session = await _context.ExamSessions
            .Include(s => s.CurrentAnswers)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            return NotFound(ApiResponse.Fail("Không tìm thấy phiên thi."));

        if (session.Status != SessionStatus.InProgress)
            return BadRequest(ApiResponse.Fail("Phiên làm bài này đã kết thúc."));

        // Validate deadline + 30s grace period for network latency
        if (DateTime.UtcNow > session.DeadlineUtc.AddSeconds(30))
        {
            session.Status = SessionStatus.TimedOut;
            await _context.SaveChangesAsync();
            return BadRequest(ApiResponse.Fail("Đã hết thời gian làm bài quy định."));
        }

        foreach (var answerDto in request.Answers)
        {
            var existing = session.CurrentAnswers.FirstOrDefault(a => a.QuestionId == answerDto.QuestionId);
            var json = JsonSerializer.Serialize(answerDto.SelectedOptionIds ?? new List<Guid>());

            if (existing != null)
            {
                existing.SelectedOptionIdsJson = json;
                existing.TextAnswer = answerDto.TextAnswer;
                existing.IsFlagged = answerDto.IsFlagged;
                existing.UpdatedAtUtc = DateTime.UtcNow;
            }
            else
            {
                session.CurrentAnswers.Add(new ExamSessionAnswer
                {
                    ExamSessionId = session.Id,
                    QuestionId = answerDto.QuestionId,
                    SelectedOptionIdsJson = json,
                    TextAnswer = answerDto.TextAnswer,
                    IsFlagged = answerDto.IsFlagged,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Đã tự động lưu bài làm."));
    }

    [HttpPost("sessions/{sessionId:guid}/submit")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ApiResponse<ExamResultDto>>> SubmitExam(Guid sessionId, [FromBody] SubmitExamRequest request)
    {
        var studentIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(studentIdStr, out var studentId);

        var session = await _context.ExamSessions
            .Include(s => s.Exam)
                .ThenInclude(e => e.Questions)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            return NotFound(ApiResponse<ExamResultDto>.Fail("Không tìm thấy phiên làm bài."));

        if (session.Status == SessionStatus.Submitted)
        {
            // Already submitted, return existing result
            return await GetResult(sessionId);
        }

        var exam = session.Exam;
        var submittedAt = DateTime.UtcNow;

        // Fetch bank questions for grading
        var questionIds = exam.Questions.Select(q => q.QuestionId).ToList();
        var bankQuestions = await _bankClient.BatchGetQuestionsAsync(questionIds);

        // Grade exam
        var (totalScore, maxScore, details) = GradingEngine.GradeExam(exam.Questions.ToList(), bankQuestions, request.Answers);

        var scorePercentage = maxScore > 0 ? Math.Round((totalScore / maxScore) * 100, 1) : 0;
        var isPassed = totalScore >= exam.PassingScore;
        var durationSeconds = (int)(submittedAt - session.StartedAtUtc).TotalSeconds;

        session.Status = SessionStatus.Submitted;
        session.SubmittedAtUtc = submittedAt;
        session.TotalScore = totalScore;
        session.MaxScore = maxScore;
        session.IsPassed = isPassed;

        var submission = new ExamSubmission
        {
            ExamSessionId = session.Id,
            ExamId = exam.Id,
            StudentId = session.StudentId,
            StudentName = session.StudentName,
            StartedAtUtc = session.StartedAtUtc,
            SubmittedAtUtc = submittedAt,
            DurationSeconds = durationSeconds,
            TotalScore = totalScore,
            MaxScore = maxScore,
            ScorePercentage = scorePercentage,
            IsPassed = isPassed,
            RiskScore = session.RiskScore,
            RiskLevel = session.RiskLevel,
            CreatedAtUtc = DateTime.UtcNow
        };

        foreach (var d in details)
        {
            submission.Details.Add(new ExamSubmissionDetail
            {
                QuestionId = d.QuestionId,
                QuestionContent = d.Content,
                Type = d.Type,
                PointsAwarded = d.PointsAwarded,
                MaxPoints = d.MaxPoints,
                IsCorrect = d.IsCorrect,
                SelectedOptionIdsJson = JsonSerializer.Serialize(d.SelectedOptionIds),
                TextAnswer = d.TextAnswer,
                CorrectOptionIdsJson = JsonSerializer.Serialize(d.CorrectOptionIds),
                AcceptedAnswersJson = JsonSerializer.Serialize(d.AcceptedAnswers),
                Explanation = d.Explanation,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        await _context.ExamSubmissions.AddAsync(submission);
        await _context.SaveChangesAsync();

        // Publish submitted event
        await _publishEndpoint.Publish(new ExamSubmittedEvent(
            session.Id,
            exam.Id,
            session.StudentId,
            session.StudentName,
            totalScore,
            maxScore,
            isPassed,
            session.RiskScore,
            session.RiskLevel,
            session.StartedAtUtc,
            submittedAt));

        _logger.LogInformation("Exam session {SessionId} submitted successfully with score {Score}/{MaxScore}", session.Id, totalScore, maxScore);

        var resultDto = new ExamResultDto
        {
            SessionId = session.Id,
            ExamId = exam.Id,
            ExamTitle = exam.Title,
            StudentId = session.StudentId,
            StudentName = session.StudentName,
            StartedAtUtc = session.StartedAtUtc,
            SubmittedAtUtc = submittedAt,
            DurationSeconds = durationSeconds,
            TotalScore = totalScore,
            MaxScore = maxScore,
            ScorePercentage = scorePercentage,
            IsPassed = isPassed,
            RiskScore = session.RiskScore,
            RiskLevel = session.RiskLevel,
            CanReview = exam.AllowReview,
            Details = exam.AllowReview ? details.Select(d => new SubmissionDetailDto
            {
                QuestionId = d.QuestionId,
                QuestionContent = d.Content,
                Type = d.Type,
                PointsAwarded = d.PointsAwarded,
                MaxPoints = d.MaxPoints,
                IsCorrect = d.IsCorrect,
                SelectedOptionIds = d.SelectedOptionIds,
                TextAnswer = d.TextAnswer,
                CorrectOptionIds = d.CorrectOptionIds,
                AcceptedAnswers = d.AcceptedAnswers,
                Explanation = d.Explanation
            }).ToList() : null
        };

        return Ok(ApiResponse<ExamResultDto>.Ok(resultDto, "Nộp bài thi thành công!"));
    }

    [HttpGet("sessions/{sessionId:guid}/result")]
    public async Task<ActionResult<ApiResponse<ExamResultDto>>> GetResult(Guid sessionId)
    {
        var submission = await _context.ExamSubmissions
            .Include(s => s.Details)
            .Include(s => s.ExamSession)
                .ThenInclude(es => es.Exam)
            .FirstOrDefaultAsync(s => s.ExamSessionId == sessionId);

        if (submission == null)
            return NotFound(ApiResponse<ExamResultDto>.Fail("Chưa có kết quả nộp bài cho phiên thi này."));

        var exam = submission.ExamSession.Exam;

        var resultDto = new ExamResultDto
        {
            SessionId = submission.ExamSessionId,
            ExamId = submission.ExamId,
            ExamTitle = exam.Title,
            StudentId = submission.StudentId,
            StudentName = submission.StudentName,
            StartedAtUtc = submission.StartedAtUtc,
            SubmittedAtUtc = submission.SubmittedAtUtc,
            DurationSeconds = submission.DurationSeconds,
            TotalScore = submission.TotalScore,
            MaxScore = submission.MaxScore,
            ScorePercentage = submission.ScorePercentage,
            IsPassed = submission.IsPassed,
            RiskScore = submission.RiskScore,
            RiskLevel = submission.RiskLevel,
            CanReview = exam.AllowReview,
            Details = exam.AllowReview ? submission.Details.Select(d => new SubmissionDetailDto
            {
                QuestionId = d.QuestionId,
                QuestionContent = d.QuestionContent,
                Type = d.Type,
                PointsAwarded = d.PointsAwarded,
                MaxPoints = d.MaxPoints,
                IsCorrect = d.IsCorrect,
                SelectedOptionIds = JsonSerializer.Deserialize<List<Guid>>(d.SelectedOptionIdsJson) ?? new(),
                TextAnswer = d.TextAnswer,
                CorrectOptionIds = JsonSerializer.Deserialize<List<Guid>>(d.CorrectOptionIdsJson) ?? new(),
                AcceptedAnswers = JsonSerializer.Deserialize<List<string>>(d.AcceptedAnswersJson) ?? new(),
                Explanation = d.Explanation
            }).ToList() : null
        };

        return Ok(ApiResponse<ExamResultDto>.Ok(resultDto));
    }

    [HttpGet("my-history")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ApiResponse<List<StudentRecentResultItemDto>>>> GetMyHistory()
    {
        var studentIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(studentIdStr, out var studentId);

        var history = await _context.ExamSubmissions
            .Include(s => s.ExamSession)
                .ThenInclude(es => es.Exam)
            .Where(s => s.StudentId == studentId)
            .OrderByDescending(s => s.SubmittedAtUtc)
            .Select(s => new StudentRecentResultItemDto
            {
                SessionId = s.ExamSessionId,
                ExamId = s.ExamId,
                ExamTitle = s.ExamSession.Exam.Title,
                SubjectName = s.ExamSession.Exam.SubjectName,
                Score = s.TotalScore,
                MaxScore = s.MaxScore,
                IsPassed = s.IsPassed,
                SubmittedAtUtc = s.SubmittedAtUtc
            })
            .ToListAsync();

        return Ok(ApiResponse<List<StudentRecentResultItemDto>>.Ok(history));
    }
}
