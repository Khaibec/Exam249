using Exam249.ReportingService.Data;
using Exam249.ReportingService.Entities;
using Exam249.Shared.Contracts.Enums;
using Exam249.Shared.Contracts.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Exam249.ReportingService.Consumers;

public class ExamSubmittedConsumer : IConsumer<ExamSubmittedEvent>
{
    private readonly ReportingDbContext _context;
    private readonly ILogger<ExamSubmittedConsumer> _logger;

    public ExamSubmittedConsumer(ReportingDbContext context, ILogger<ExamSubmittedConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ExamSubmittedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Processing ExamSubmittedEvent for student {StudentName}, Exam {ExamId}", msg.StudentName, msg.ExamId);

        // 1. Audit log
        var audit = new SystemAuditLog
        {
            UserId = msg.StudentId,
            UserName = msg.StudentName,
            Action = "Thí sinh nộp bài thi",
            Details = $"Nộp bài thi. Điểm: {msg.FinalScore:0.#}/{msg.MaxScore:0.#} ({(msg.IsPassed ? "ĐẠT" : "CHƯA ĐẠT")}). Risk Score: {msg.RiskScore} ({msg.RiskLevel}).",
            TimestampUtc = msg.SubmittedAtUtc
        };
        await _context.SystemAuditLogs.AddAsync(audit);

        // 2. Exam report snapshot aggregation
        var snapshot = await _context.ExamReportSnapshots
            .FirstOrDefaultAsync(s => s.ExamId == msg.ExamId);

        if (snapshot == null)
        {
            snapshot = new ExamReportSnapshot
            {
                ExamId = msg.ExamId,
                ExamTitle = "Bài thi đã nộp",
                ClassroomName = "Lớp học",
                TotalSubmissions = 1,
                AverageScore = Math.Round(msg.FinalScore, 2),
                HighestScore = msg.FinalScore,
                LowestScore = msg.FinalScore,
                PassRate = msg.IsPassed ? 100.0 : 0.0,
                HighRiskCount = msg.RiskLevel >= RiskLevel.HighRisk ? 1 : 0
            };
            await _context.ExamReportSnapshots.AddAsync(snapshot);
        }
        else
        {
            var prevCount = snapshot.TotalSubmissions;
            var newCount = prevCount + 1;
            snapshot.AverageScore = Math.Round(((snapshot.AverageScore * prevCount) + msg.FinalScore) / newCount, 2);
            snapshot.HighestScore = Math.Max(snapshot.HighestScore, msg.FinalScore);
            snapshot.LowestScore = Math.Min(snapshot.LowestScore, msg.FinalScore);
            snapshot.TotalSubmissions = newCount;
            if (msg.RiskLevel >= RiskLevel.HighRisk)
            {
                snapshot.HighRiskCount++;
            }

            // Approximate pass rate
            var prevPassCount = (int)Math.Round((snapshot.PassRate / 100.0) * prevCount);
            var newPassCount = prevPassCount + (msg.IsPassed ? 1 : 0);
            snapshot.PassRate = Math.Round(((double)newPassCount / newCount) * 100.0, 1);
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Successfully updated reporting statistics for Exam {ExamId}", msg.ExamId);
    }
}
