using Exam249.Shared.Common.Entities;
using Exam249.Shared.Contracts.Enums;

namespace Exam249.AntiCheatService.Entities;

public class ExamViolation : BaseEntity
{
    public Guid SessionId { get; set; }
    public Guid StudentId { get; set; }
    public ViolationType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Metadata { get; set; } // Key-value or details (e.g., duration, key combination)
    public int PenaltyPoints { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}

public class RiskAssessment : BaseEntity
{
    public Guid SessionId { get; set; }
    public Guid StudentId { get; set; }
    public int TotalRiskScore { get; set; } = 0; // 0 - 100
    public RiskLevel RiskLevel { get; set; } = RiskLevel.Safe;
    public int ViolationsCount { get; set; } = 0;
    public DateTime LastEvaluatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class ProctoringSnapshot : BaseEntity
{
    public Guid SessionId { get; set; }
    public Guid StudentId { get; set; }
    public string ImageData { get; set; } = string.Empty; // Base64 data or file URI
    public string TriggerReason { get; set; } = "Periodic";
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
}
