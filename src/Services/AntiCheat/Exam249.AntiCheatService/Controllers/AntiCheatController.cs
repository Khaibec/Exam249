using System.Security.Claims;
using Exam249.AntiCheatService.Data;
using Exam249.AntiCheatService.Entities;
using Exam249.AntiCheatService.Hubs;
using Exam249.AntiCheatService.Services;
using Exam249.Shared.Common.Security;
using Exam249.Shared.Common.Utilities;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;
using Exam249.Shared.Contracts.Events;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Exam249.AntiCheatService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AntiCheatController : ControllerBase
{
    private readonly AntiCheatDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IHubContext<ProctoringHub> _hubContext;
    private readonly LiveProctoringRegistry _registry;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AntiCheatController> _logger;

    public AntiCheatController(
        AntiCheatDbContext context,
        IPublishEndpoint publishEndpoint,
        IHubContext<ProctoringHub> hubContext,
        LiveProctoringRegistry registry,
        IConfiguration configuration,
        ILogger<AntiCheatController> logger)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
        _hubContext = hubContext;
        _registry = registry;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("violations")]
    public async Task<ActionResult<ApiResponse<RiskScoreSummaryDto>>> RecordViolation([FromBody] RecordViolationRequest request)
    {
        var studentIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(studentIdStr, out var studentId);

        var existingAssessment = await _context.RiskAssessments
            .FirstOrDefaultAsync(r => r.SessionId == request.SessionId);

        // Security Fix (HIGH-03): Prevent framing attack where caller records violations for someone else's session
        if (existingAssessment != null && existingAssessment.StudentId != studentId)
        {
            return Forbid();
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? request.IpAddress ?? "unknown";
        var ua = Request.Headers.UserAgent.ToString();

        var summary = await RecordViolationCoreAsync(
            request.SessionId,
            studentId,
            request.ExamId,
            request.Type,
            request.Description,
            request.Metadata,
            ip,
            ua);

        return Ok(ApiResponse<RiskScoreSummaryDto>.Ok(summary, "Ghi nhận vi phạm thành công."));
    }

    [HttpPost("internal/violations")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<RiskScoreSummaryDto>>> RecordInternalViolation([FromBody] InternalViolationRequest request)
    {
        if (!InternalSecurityConstants.IsValidInternalRequest(Request, _configuration))
        {
            return Forbid();
        }

        var summary = await RecordViolationCoreAsync(
            request.SessionId,
            request.StudentId,
            request.ExamId,
            request.Type,
            request.Description,
            request.Metadata,
            request.IpAddress ?? "internal",
            request.UserAgent ?? "ExamService");

        return Ok(ApiResponse<RiskScoreSummaryDto>.Ok(summary, "Ghi nhận vi phạm nội bộ thành công."));
    }

    private async Task<RiskScoreSummaryDto> RecordViolationCoreAsync(
        Guid sessionId,
        Guid studentId,
        Guid? examId,
        ViolationType type,
        string? description,
        string? metadata,
        string ipAddress,
        string userAgent)
    {
        var penalty = AntiCheatRiskCalculator.GetPenaltyPoints(type);
        var violationName = AntiCheatRiskCalculator.GetViolationNameVi(type);

        var violation = new ExamViolation
        {
            SessionId = sessionId,
            StudentId = studentId,
            Type = type,
            Description = description ?? violationName,
            Metadata = metadata,
            PenaltyPoints = penalty,
            TimestampUtc = DateTime.UtcNow,
            IpAddress = ipAddress,
            UserAgent = userAgent
        };

        var assessment = await _context.RiskAssessments
            .FirstOrDefaultAsync(r => r.SessionId == sessionId);

        await _context.ExamViolations.AddAsync(violation);

        if (assessment == null)
        {
            assessment = new RiskAssessment
            {
                SessionId = sessionId,
                ExamId = examId ?? _registry.GetExamId(sessionId),
                StudentId = studentId,
                TotalRiskScore = 0,
                ViolationsCount = 0,
                RiskLevel = RiskLevel.Safe,
                LastEvaluatedAtUtc = DateTime.UtcNow
            };
            await _context.RiskAssessments.AddAsync(assessment);
        }
        else if (!assessment.ExamId.HasValue && (examId.HasValue || _registry.GetExamId(sessionId).HasValue))
        {
            assessment.ExamId = examId ?? _registry.GetExamId(sessionId);
        }

        var allPenalties = await _context.ExamViolations
            .Where(v => v.SessionId == sessionId)
            .SumAsync(v => v.PenaltyPoints) + penalty;

        assessment.TotalRiskScore = Math.Min(100, allPenalties);
        assessment.RiskLevel = AntiCheatRiskCalculator.CalculateRiskLevel(assessment.TotalRiskScore);
        assessment.ViolationsCount++;
        assessment.LastEvaluatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var resolvedExamId = assessment.ExamId ?? examId ?? _registry.GetExamId(sessionId);
        var updatedLive = _registry.UpdateViolation(sessionId, resolvedExamId, assessment.TotalRiskScore, assessment.RiskLevel, assessment.ViolationsCount);

        await _publishEndpoint.Publish(new ViolationRecordedEvent(
            sessionId,
            studentId,
            type,
            penalty,
            assessment.TotalRiskScore,
            assessment.RiskLevel,
            violation.TimestampUtc,
            violation.Description,
            violation.Metadata));

        if (resolvedExamId.HasValue)
        {
            await _hubContext.Clients.Group(ProctoringHub.ProctorGroup(resolvedExamId.Value))
                .SendAsync("ViolationAlert", new
                {
                    SessionId = sessionId,
                    ExamId = resolvedExamId.Value,
                    StudentId = studentId,
                    StudentName = updatedLive?.StudentName ?? "Thí sinh",
                    TotalRiskScore = assessment.TotalRiskScore,
                    RiskLevel = assessment.RiskLevel,
                    ViolationsCount = assessment.ViolationsCount,
                    Violation = new ViolationEventDto
                    {
                        Id = violation.Id,
                        SessionId = violation.SessionId,
                        Type = violation.Type,
                        TypeName = violationName,
                        Description = violation.Description,
                        Metadata = violation.Metadata,
                        PenaltyPoints = violation.PenaltyPoints,
                        TimestampUtc = violation.TimestampUtc,
                        IpAddress = violation.IpAddress
                    }
                });
        }

        _logger.LogWarning("AntiCheat violation recorded for session {SessionId}: {Type} (+{Penalty} pts). Total: {TotalPts} ({Level})",
            sessionId, type, penalty, assessment.TotalRiskScore, assessment.RiskLevel);

        return await BuildSummary(sessionId);
    }

    [HttpGet("sessions/{sessionId:guid}/summary")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<RiskScoreSummaryDto>>> GetSessionSummary(Guid sessionId)
    {
        var isInternal = InternalSecurityConstants.IsValidInternalRequest(Request, _configuration);
        var isAuthenticated = User.Identity?.IsAuthenticated == true;

        if (!isInternal && !isAuthenticated)
        {
            return Unauthorized(ApiResponse<RiskScoreSummaryDto>.Fail("Yêu cầu không được ủy quyền."));
        }

        var summary = await BuildSummary(sessionId);
        return Ok(ApiResponse<RiskScoreSummaryDto>.Ok(summary));
    }

    [HttpPost("sessions/batch-summary")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<List<RiskScoreSummaryDto>>>> GetBatchSessionSummaries([FromBody] List<Guid> sessionIds)
    {
        var isInternal = InternalSecurityConstants.IsValidInternalRequest(Request, _configuration);
        var isPrivileged = User.IsInRole("Teacher") || User.IsInRole("Admin");

        if (!isInternal && !isPrivileged)
        {
            return Forbid();
        }

        var results = new List<RiskScoreSummaryDto>();
        foreach (var sid in sessionIds)
        {
            var summary = await BuildSummary(sid);
            results.Add(summary);
        }

        return Ok(ApiResponse<List<RiskScoreSummaryDto>>.Ok(results));
    }

    [HttpGet("sessions/{sessionId:guid}/violations")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<List<ViolationEventDto>>>> GetSessionViolations(Guid sessionId)
    {
        var violations = await _context.ExamViolations
            .Where(v => v.SessionId == sessionId)
            .OrderByDescending(v => v.TimestampUtc)
            .Select(v => new ViolationEventDto
            {
                Id = v.Id,
                SessionId = v.SessionId,
                Type = v.Type,
                TypeName = AntiCheatRiskCalculator.GetViolationNameVi(v.Type),
                Description = v.Description,
                Metadata = v.Metadata,
                PenaltyPoints = v.PenaltyPoints,
                TimestampUtc = v.TimestampUtc,
                IpAddress = v.IpAddress
            })
            .ToListAsync();

        return Ok(ApiResponse<List<ViolationEventDto>>.Ok(violations));
    }

    [HttpPost("sessions/{sessionId:guid}/snapshots")]
    public async Task<ActionResult<ApiResponse>> UploadSnapshot(Guid sessionId, [FromBody] ProctoringSnapshotRequest request)
    {
        var studentIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(studentIdStr, out var studentId);

        string imageStoragePath = request.Base64Image;

        // Optimize database storage: Persist snapshot image to file disk if base64 format is provided
        try
        {
            if (!string.IsNullOrWhiteSpace(request.Base64Image) && request.Base64Image.StartsWith("data:image"))
            {
                var base64Part = request.Base64Image;
                var commaIndex = base64Part.IndexOf(',');
                if (commaIndex >= 0)
                {
                    base64Part = base64Part.Substring(commaIndex + 1);
                }

                var imageBytes = Convert.FromBase64String(base64Part);
                var storageFolder = Path.Combine(Directory.GetCurrentDirectory(), "Storage", "Snapshots", sessionId.ToString());
                Directory.CreateDirectory(storageFolder);

                var fileName = $"{Guid.NewGuid():N}.jpg";
                var fullPath = Path.Combine(storageFolder, fileName);
                await System.IO.File.WriteAllBytesAsync(fullPath, imageBytes);

                // Store relative URL instead of massive base64 blob
                imageStoragePath = $"/api/anticheat/sessions/{sessionId}/snapshots/image/{fileName}";
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not write snapshot to disk. Falling back to inline string.");
        }

        var snapshot = new ProctoringSnapshot
        {
            SessionId = sessionId,
            StudentId = studentId,
            ImageData = imageStoragePath,
            TriggerReason = request.TriggerReason,
            TimestampUtc = DateTime.UtcNow
        };

        await _context.ProctoringSnapshots.AddAsync(snapshot);
        await _context.SaveChangesAsync();

        _registry.UpdateSnapshot(sessionId, imageStoragePath);

        var resolvedExamId = request.ExamId ?? _registry.GetExamId(sessionId);
        if (!resolvedExamId.HasValue)
        {
            resolvedExamId = await _context.RiskAssessments
                .Where(r => r.SessionId == sessionId)
                .Select(r => r.ExamId)
                .FirstOrDefaultAsync();
        }

        if (resolvedExamId.HasValue)
        {
            await _hubContext.Clients.Group(ProctoringHub.ProctorGroup(resolvedExamId.Value))
                .SendAsync("SnapshotCaptured", new
                {
                    SessionId = sessionId,
                    ExamId = resolvedExamId.Value,
                    ImageUrl = imageStoragePath,
                    TriggerReason = snapshot.TriggerReason,
                    TimestampUtc = snapshot.TimestampUtc
                });
        }

        return Ok(ApiResponse.Ok("Lưu ảnh giám sát thành công."));
    }

    [HttpGet("sessions/{sessionId:guid}/snapshots/image/{fileName}")]
    [Authorize(Roles = "Teacher,Admin")]
    public IActionResult GetSnapshotImageFile(Guid sessionId, string fileName)
    {
        // Prevent path traversal
        var safeFileName = Path.GetFileName(fileName);
        var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "Storage", "Snapshots", sessionId.ToString(), safeFileName);

        if (!System.IO.File.Exists(fullPath))
            return NotFound();

        return PhysicalFile(fullPath, "image/jpeg");
    }

    [HttpGet("sessions/{sessionId:guid}/snapshots")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<List<ProctoringSnapshotDto>>>> GetSnapshots(Guid sessionId)
    {
        var snapshots = await _context.ProctoringSnapshots
            .Where(s => s.SessionId == sessionId)
            .OrderByDescending(s => s.TimestampUtc)
            .Select(s => new ProctoringSnapshotDto
            {
                Id = s.Id,
                SessionId = s.SessionId,
                ImageUrl = s.ImageData,
                TriggerReason = s.TriggerReason,
                TimestampUtc = s.TimestampUtc
            })
            .ToListAsync();

        return Ok(ApiResponse<List<ProctoringSnapshotDto>>.Ok(snapshots));
    }

    [HttpGet("exams/{examId:guid}/live-sessions")]
    [Authorize(Roles = "Teacher,Admin")]
    public ActionResult<ApiResponse<List<LiveSessionMonitorDto>>> GetLiveSessions(Guid examId)
    {
        var sessions = _registry.GetSessionsByExam(examId);
        return Ok(ApiResponse<List<LiveSessionMonitorDto>>.Ok(sessions));
    }

    [HttpPost("internal/live-sessions/init")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LiveSessionMonitorDto>>> InitLiveSession([FromBody] InitLiveSessionRequest request)
    {
        if (!InternalSecurityConstants.IsValidInternalRequest(Request, _configuration))
            return Forbid();

        var assessment = await _context.RiskAssessments.FirstOrDefaultAsync(r => r.SessionId == request.SessionId);
        if (assessment == null)
        {
            assessment = new RiskAssessment
            {
                SessionId = request.SessionId,
                ExamId = request.ExamId,
                StudentId = request.StudentId,
                TotalRiskScore = 0,
                ViolationsCount = 0,
                RiskLevel = RiskLevel.Safe,
                LastEvaluatedAtUtc = request.StartedAtUtc
            };
            await _context.RiskAssessments.AddAsync(assessment);
            await _context.SaveChangesAsync();
        }
        else if (!assessment.ExamId.HasValue)
        {
            assessment.ExamId = request.ExamId;
            await _context.SaveChangesAsync();
        }

        var latestSnapshot = await _context.ProctoringSnapshots
            .Where(s => s.SessionId == request.SessionId)
            .OrderByDescending(s => s.TimestampUtc)
            .Select(s => s.ImageData)
            .FirstOrDefaultAsync();

        var dto = _registry.InitSession(request, assessment.TotalRiskScore, assessment.RiskLevel, assessment.ViolationsCount, latestSnapshot);
        await _hubContext.Clients.Group(ProctoringHub.ProctorGroup(request.ExamId))
            .SendAsync("StudentJoined", dto);

        return Ok(ApiResponse<LiveSessionMonitorDto>.Ok(dto));
    }

    [HttpPost("internal/live-sessions/{sessionId:guid}/submitted")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse>> NotifySessionSubmitted(Guid sessionId, [FromQuery] Guid? examId = null)
    {
        if (!InternalSecurityConstants.IsValidInternalRequest(Request, _configuration))
            return Forbid();

        var dto = _registry.MarkStatus(sessionId, SessionStatus.Submitted);
        var resolvedExamId = examId ?? dto?.ExamId ?? _registry.GetExamId(sessionId);
        if (resolvedExamId.HasValue)
        {
            await _hubContext.Clients.Group(ProctoringHub.ProctorGroup(resolvedExamId.Value))
                .SendAsync("StudentSubmitted", new { SessionId = sessionId, ExamId = resolvedExamId.Value });
        }

        return Ok(ApiResponse.Ok("Đã cập nhật trạng thái nộp bài."));
    }

    [HttpPost("internal/live-sessions/{sessionId:guid}/disqualified")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse>> NotifySessionDisqualified(
        Guid sessionId,
        [FromQuery] Guid? examId,
        [FromBody] DisqualifySessionRequest request)
    {
        if (!InternalSecurityConstants.IsValidInternalRequest(Request, _configuration))
            return Forbid();

        var dto = _registry.MarkStatus(sessionId, SessionStatus.Disqualified);
        var resolvedExamId = examId ?? dto?.ExamId ?? _registry.GetExamId(sessionId);

        await _hubContext.Clients.Group(ProctoringHub.SessionGroup(sessionId))
            .SendAsync("ForceDisqualified", new { SessionId = sessionId, Reason = request.Reason });

        if (resolvedExamId.HasValue)
        {
            await _hubContext.Clients.Group(ProctoringHub.ProctorGroup(resolvedExamId.Value))
                .SendAsync("SessionDisqualified", new { SessionId = sessionId, ExamId = resolvedExamId.Value, Reason = request.Reason });
        }

        return Ok(ApiResponse.Ok("Đã gửi lệnh đình chỉ phiên thi."));
    }

    private async Task<RiskScoreSummaryDto> BuildSummary(Guid sessionId)
    {
        var assessment = await _context.RiskAssessments
            .FirstOrDefaultAsync(r => r.SessionId == sessionId);

        var violations = await _context.ExamViolations
            .Where(v => v.SessionId == sessionId)
            .OrderByDescending(v => v.TimestampUtc)
            .ToListAsync();

        var breakdown = violations
            .GroupBy(v => v.Type)
            .Select(g => new ViolationBreakdownItem
            {
                Type = g.Key,
                TypeName = AntiCheatRiskCalculator.GetViolationNameVi(g.Key),
                Count = g.Count(),
                TotalPenalty = g.Sum(x => x.PenaltyPoints)
            })
            .ToList();

        return new RiskScoreSummaryDto
        {
            SessionId = sessionId,
            ExamId = assessment?.ExamId ?? _registry.GetExamId(sessionId),
            TotalRiskScore = assessment?.TotalRiskScore ?? 0,
            RiskLevel = assessment?.RiskLevel ?? RiskLevel.Safe,
            ViolationsCount = violations.Count,
            Breakdown = breakdown,
            RecentViolations = violations.Take(10).Select(v => new ViolationEventDto
            {
                Id = v.Id,
                SessionId = v.SessionId,
                Type = v.Type,
                TypeName = AntiCheatRiskCalculator.GetViolationNameVi(v.Type),
                Description = v.Description,
                Metadata = v.Metadata,
                PenaltyPoints = v.PenaltyPoints,
                TimestampUtc = v.TimestampUtc,
                IpAddress = v.IpAddress
            }).ToList()
        };
    }
}
