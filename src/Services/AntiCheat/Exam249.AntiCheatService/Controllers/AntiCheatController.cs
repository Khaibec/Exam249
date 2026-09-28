using System.Security.Claims;
using Exam249.AntiCheatService.Data;
using Exam249.AntiCheatService.Entities;
using Exam249.Shared.Common.Utilities;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;
using Exam249.Shared.Contracts.Events;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Exam249.AntiCheatService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AntiCheatController : ControllerBase
{
    private readonly AntiCheatDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<AntiCheatController> _logger;

    public AntiCheatController(
        AntiCheatDbContext context,
        IPublishEndpoint publishEndpoint,
        ILogger<AntiCheatController> logger)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
        _logger = logger;
    }

    [HttpPost("violations")]
    public async Task<ActionResult<ApiResponse<RiskScoreSummaryDto>>> RecordViolation([FromBody] RecordViolationRequest request)
    {
        var studentIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(studentIdStr, out var studentId);

        var penalty = AntiCheatRiskCalculator.GetPenaltyPoints(request.Type);
        var violationName = AntiCheatRiskCalculator.GetViolationNameVi(request.Type);

        var violation = new ExamViolation
        {
            SessionId = request.SessionId,
            StudentId = studentId,
            Type = request.Type,
            Description = request.Description ?? violationName,
            Metadata = request.Metadata,
            PenaltyPoints = penalty,
            TimestampUtc = DateTime.UtcNow,
            // Security Fix (HIGH-03): Prioritize trusted remote IP to prevent client-side spoofing
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? request.IpAddress ?? "unknown",
            UserAgent = Request.Headers.UserAgent.ToString()
        };

        // Update or create RiskAssessment
        var assessment = await _context.RiskAssessments
            .FirstOrDefaultAsync(r => r.SessionId == request.SessionId);

        // Security Fix (HIGH-03): Prevent framing attack where caller records violations for someone else's session
        if (assessment != null && assessment.StudentId != studentId)
        {
            return Forbid();
        }

        await _context.ExamViolations.AddAsync(violation);

        if (assessment == null)
        {
            assessment = new RiskAssessment
            {
                SessionId = request.SessionId,
                StudentId = studentId,
                TotalRiskScore = 0,
                ViolationsCount = 0,
                RiskLevel = RiskLevel.Safe,
                LastEvaluatedAtUtc = DateTime.UtcNow
            };
            await _context.RiskAssessments.AddAsync(assessment);
        }

        // Sum all penalties for this session
        var allPenalties = await _context.ExamViolations
            .Where(v => v.SessionId == request.SessionId)
            .SumAsync(v => v.PenaltyPoints) + penalty;

        assessment.TotalRiskScore = Math.Min(100, allPenalties);
        assessment.RiskLevel = AntiCheatRiskCalculator.CalculateRiskLevel(assessment.TotalRiskScore);
        assessment.ViolationsCount++;
        assessment.LastEvaluatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Publish event
        await _publishEndpoint.Publish(new ViolationRecordedEvent(
            request.SessionId,
            studentId,
            request.Type,
            penalty,
            assessment.TotalRiskScore,
            assessment.RiskLevel,
            violation.TimestampUtc,
            violation.Description,
            violation.Metadata));

        _logger.LogWarning("AntiCheat violation recorded for session {SessionId}: {Type} (+{Penalty} pts). Total: {TotalPts} ({Level})",
            request.SessionId, request.Type, penalty, assessment.TotalRiskScore, assessment.RiskLevel);

        var summary = await BuildSummary(request.SessionId);
        return Ok(ApiResponse<RiskScoreSummaryDto>.Ok(summary, "Ghi nhận vi phạm thành công."));
    }

    [HttpGet("sessions/{sessionId:guid}/summary")]
    public async Task<ActionResult<ApiResponse<RiskScoreSummaryDto>>> GetSessionSummary(Guid sessionId)
    {
        var summary = await BuildSummary(sessionId);
        return Ok(ApiResponse<RiskScoreSummaryDto>.Ok(summary));
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

        var snapshot = new ProctoringSnapshot
        {
            SessionId = sessionId,
            StudentId = studentId,
            ImageData = request.Base64Image,
            TriggerReason = request.TriggerReason,
            TimestampUtc = DateTime.UtcNow
        };

        await _context.ProctoringSnapshots.AddAsync(snapshot);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Lưu ảnh giám sát thành công."));
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
