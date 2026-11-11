using Exam249.AntiCheatService.Services;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;
using Xunit;

namespace Exam249.UnitTests;

public class LiveProctoringRegistryTests
{
    [Fact]
    public void InitAndConnectStudent_ShouldTrackProgressViolationsAndOnlineStatus()
    {
        var registry = new LiveProctoringRegistry();
        var examId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        registry.InitSession(new InitLiveSessionRequest
        {
            SessionId = sessionId,
            ExamId = examId,
            StudentId = studentId,
            StudentName = "Nguyễn Văn A",
            StudentEmail = "a@exam249.com",
            ExamVariantCode = "105",
            StartedAtUtc = DateTime.UtcNow,
            DeadlineUtc = DateTime.UtcNow.AddMinutes(30),
            TotalQuestions = 10
        });

        var connected = registry.OnStudentConnected(examId, sessionId, studentId, "Nguyễn Văn A", 10, "conn-1");
        Assert.True(connected.IsOnline);
        Assert.Equal("105", connected.ExamVariantCode);

        var progressed = registry.UpdateProgress(sessionId, answeredCount: 4, totalQuestions: 10, webcamActive: true);
        Assert.NotNull(progressed);
        Assert.Equal(4, progressed!.AnsweredCount);
        Assert.True(progressed.WebcamActive);

        var violated = registry.UpdateViolation(sessionId, examId, 35, RiskLevel.Suspicious, 2);
        Assert.NotNull(violated);
        Assert.Equal(35, violated!.TotalRiskScore);
        Assert.Equal(RiskLevel.Suspicious, violated.RiskLevel);
        Assert.Equal(2, violated.ViolationsCount);

        var snapUpdated = registry.UpdateSnapshot(sessionId, "/api/anticheat/sessions/123/snapshots/image/abc.jpg");
        Assert.NotNull(snapUpdated);
        Assert.Equal("/api/anticheat/sessions/123/snapshots/image/abc.jpg", snapUpdated!.LatestSnapshotUrl);

        var disconnected = registry.OnConnectionDisconnected("conn-1");
        Assert.NotNull(disconnected);
        Assert.Equal(examId, disconnected!.Value.ExamId);
        Assert.False(disconnected.Value.IsOnline);

        var list = registry.GetSessionsByExam(examId);
        Assert.Single(list);
        Assert.False(list[0].IsOnline);
    }

    [Fact]
    public void MarkStatus_Disqualified_ShouldSortBelowInProgressAndReflectStatus()
    {
        var registry = new LiveProctoringRegistry();
        var examId = Guid.NewGuid();
        var s1 = Guid.NewGuid();
        var s2 = Guid.NewGuid();

        registry.InitSession(new InitLiveSessionRequest
        {
            SessionId = s1, ExamId = examId, StudentId = Guid.NewGuid(),
            StudentName = "Student 1", StartedAtUtc = DateTime.UtcNow, DeadlineUtc = DateTime.UtcNow.AddMinutes(30)
        });
        registry.InitSession(new InitLiveSessionRequest
        {
            SessionId = s2, ExamId = examId, StudentId = Guid.NewGuid(),
            StudentName = "Student 2", StartedAtUtc = DateTime.UtcNow, DeadlineUtc = DateTime.UtcNow.AddMinutes(30)
        });

        registry.MarkStatus(s1, SessionStatus.Disqualified);

        var list = registry.GetSessionsByExam(examId);
        Assert.Equal(2, list.Count);
        Assert.Equal(s2, list[0].SessionId); // InProgress first
        Assert.Equal(s1, list[1].SessionId);
        Assert.Equal(SessionStatus.Disqualified, list[1].Status);
    }
}
