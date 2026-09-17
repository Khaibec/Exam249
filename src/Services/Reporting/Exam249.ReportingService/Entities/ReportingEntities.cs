using Exam249.Shared.Common.Entities;

namespace Exam249.ReportingService.Entities;

public class ExamReportSnapshot : BaseEntity
{
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public string ClassroomName { get; set; } = string.Empty;
    public int TotalSubmissions { get; set; }
    public double AverageScore { get; set; }
    public double HighestScore { get; set; }
    public double LowestScore { get; set; }
    public double PassRate { get; set; }
    public int HighRiskCount { get; set; }
}

public class SystemAuditLog : BaseEntity
{
    public Guid? UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
}
