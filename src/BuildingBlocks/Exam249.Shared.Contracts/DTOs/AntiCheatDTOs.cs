using Exam249.Shared.Contracts.Enums;

namespace Exam249.Shared.Contracts.DTOs;

public class RecordViolationRequest
{
    public Guid SessionId { get; set; }
    public ViolationType Type { get; set; }
    public string? Description { get; set; }
    public string? Metadata { get; set; } // JSON or key-value details e.g. "duration: 4.2s"
    public string? UserAgent { get; set; }
    public string? IpAddress { get; set; }
}

public class ViolationEventDto
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public ViolationType Type { get; set; }
    public string TypeName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Metadata { get; set; }
    public int PenaltyPoints { get; set; }
    public DateTime TimestampUtc { get; set; }
    public string? IpAddress { get; set; }
}

public class RiskScoreSummaryDto
{
    public Guid SessionId { get; set; }
    public int TotalRiskScore { get; set; } // 0 - 100
    public RiskLevel RiskLevel { get; set; }
    public int ViolationsCount { get; set; }
    public List<ViolationBreakdownItem> Breakdown { get; set; } = new();
    public List<ViolationEventDto> RecentViolations { get; set; } = new();
}

public class ViolationBreakdownItem
{
    public ViolationType Type { get; set; }
    public string TypeName { get; set; } = string.Empty;
    public int Count { get; set; }
    public int TotalPenalty { get; set; }
}

public class ProctoringSnapshotRequest
{
    public Guid SessionId { get; set; }
    public string Base64Image { get; set; } = string.Empty;
    public string TriggerReason { get; set; } = "Periodic"; // Periodic, TabSwitch, SuspiciousAction
}

public class ProctoringSnapshotDto
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string TriggerReason { get; set; } = string.Empty;
    public DateTime TimestampUtc { get; set; }
}
