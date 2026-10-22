using Exam249.AntiCheatService.Data;
using Exam249.AntiCheatService.Entities;
using Exam249.Shared.Contracts.Enums;
using Exam249.Shared.Contracts.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Exam249.AntiCheatService.Consumers;

public class ExamSessionStartedConsumer : IConsumer<ExamSessionStartedEvent>
{
    private readonly AntiCheatDbContext _context;
    private readonly ILogger<ExamSessionStartedConsumer> _logger;

    public ExamSessionStartedConsumer(AntiCheatDbContext context, ILogger<ExamSessionStartedConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ExamSessionStartedEvent> context)
    {
        var msg = context.Message;
        var existing = await _context.RiskAssessments.FirstOrDefaultAsync(r => r.SessionId == msg.SessionId);
        if (existing == null)
        {
            var assessment = new RiskAssessment
            {
                SessionId = msg.SessionId,
                StudentId = msg.StudentId,
                TotalRiskScore = 0,
                ViolationsCount = 0,
                RiskLevel = RiskLevel.Safe,
                LastEvaluatedAtUtc = msg.StartedAtUtc
            };
            await _context.RiskAssessments.AddAsync(assessment);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Initialized RiskAssessment for session {SessionId}, student {StudentId}", msg.SessionId, msg.StudentId);
        }
    }
}
