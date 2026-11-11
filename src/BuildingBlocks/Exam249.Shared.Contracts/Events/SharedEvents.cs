using Exam249.Shared.Contracts.Enums;

namespace Exam249.Shared.Contracts.Events;

public record ExamSessionStartedEvent(
    Guid SessionId,
    Guid ExamId,
    Guid StudentId,
    string StudentName,
    DateTime StartedAtUtc,
    DateTime DeadlineUtc,
    string IpAddress,
    string UserAgent,
    string StudentEmail = "",
    string ExamVariantCode = "101",
    int TotalQuestions = 0);

public record ViolationRecordedEvent(
    Guid SessionId,
    Guid StudentId,
    ViolationType Type,
    int PenaltyPoints,
    int CurrentTotalRiskScore,
    RiskLevel CurrentRiskLevel,
    DateTime TimestampUtc,
    string? Description,
    string? Metadata);

public record ExamSubmittedEvent(
    Guid SessionId,
    Guid ExamId,
    Guid StudentId,
    string StudentName,
    double FinalScore,
    double MaxScore,
    bool IsPassed,
    int RiskScore,
    RiskLevel RiskLevel,
    DateTime StartedAtUtc,
    DateTime SubmittedAtUtc,
    string ExamTitle = "",
    string ClassroomName = "");

public record SessionDisqualifiedEvent(
    Guid SessionId,
    Guid ExamId,
    Guid StudentId,
    string Reason,
    DateTime DisqualifiedAtUtc);
