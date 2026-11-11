using Exam249.AntiCheatService.Data;
using Exam249.AntiCheatService.Entities;
using Exam249.AntiCheatService.Hubs;
using Exam249.AntiCheatService.Services;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;
using Exam249.Shared.Contracts.Events;
using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Exam249.AntiCheatService.Consumers;

public class ExamSessionStartedConsumer : IConsumer<ExamSessionStartedEvent>
{
    private readonly AntiCheatDbContext _context;
    private readonly LiveProctoringRegistry _registry;
    private readonly IHubContext<ProctoringHub> _hubContext;
    private readonly ILogger<ExamSessionStartedConsumer> _logger;

    public ExamSessionStartedConsumer(
        AntiCheatDbContext context,
        LiveProctoringRegistry registry,
        IHubContext<ProctoringHub> hubContext,
        ILogger<ExamSessionStartedConsumer> logger)
    {
        _context = context;
        _registry = registry;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ExamSessionStartedEvent> context)
    {
        var msg = context.Message;
        var existing = await _context.RiskAssessments.FirstOrDefaultAsync(r => r.SessionId == msg.SessionId);
        if (existing == null)
        {
            existing = new RiskAssessment
            {
                SessionId = msg.SessionId,
                ExamId = msg.ExamId,
                StudentId = msg.StudentId,
                TotalRiskScore = 0,
                ViolationsCount = 0,
                RiskLevel = RiskLevel.Safe,
                LastEvaluatedAtUtc = msg.StartedAtUtc
            };
            await _context.RiskAssessments.AddAsync(existing);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Initialized RiskAssessment for session {SessionId}, student {StudentId}", msg.SessionId, msg.StudentId);
        }
        else if (!existing.ExamId.HasValue)
        {
            existing.ExamId = msg.ExamId;
            await _context.SaveChangesAsync();
        }

        var dto = _registry.InitSession(new InitLiveSessionRequest
        {
            SessionId = msg.SessionId,
            ExamId = msg.ExamId,
            StudentId = msg.StudentId,
            StudentName = msg.StudentName,
            StudentEmail = msg.StudentEmail,
            ExamVariantCode = msg.ExamVariantCode,
            StartedAtUtc = msg.StartedAtUtc,
            DeadlineUtc = msg.DeadlineUtc,
            TotalQuestions = msg.TotalQuestions
        }, existing.TotalRiskScore, existing.RiskLevel, existing.ViolationsCount);

        await _hubContext.Clients.Group(ProctoringHub.ProctorGroup(msg.ExamId))
            .SendAsync("StudentJoined", dto);
    }
}
