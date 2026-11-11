using System.Collections.Concurrent;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;

namespace Exam249.AntiCheatService.Services;

public class LiveProctoringRegistry
{
    private class SessionState
    {
        public Guid SessionId { get; set; }
        public Guid ExamId { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string StudentEmail { get; set; } = string.Empty;
        public string ExamVariantCode { get; set; } = "101";
        public DateTime StartedAtUtc { get; set; }
        public DateTime DeadlineUtc { get; set; }
        public SessionStatus Status { get; set; } = SessionStatus.InProgress;
        public int AnsweredCount { get; set; }
        public int TotalQuestions { get; set; }
        public int TotalRiskScore { get; set; }
        public RiskLevel RiskLevel { get; set; } = RiskLevel.Safe;
        public int ViolationsCount { get; set; }
        public string? LatestSnapshotUrl { get; set; }
        public bool WebcamActive { get; set; }
        public DateTime LastHeartbeatUtc { get; set; } = DateTime.UtcNow;
        public HashSet<string> ConnectionIds { get; } = new();
        public object SyncLock { get; } = new();

        public LiveSessionMonitorDto ToDto()
        {
            lock (SyncLock)
            {
                return new LiveSessionMonitorDto
                {
                    SessionId = SessionId,
                    ExamId = ExamId,
                    StudentId = StudentId,
                    StudentName = StudentName,
                    StudentEmail = StudentEmail,
                    ExamVariantCode = ExamVariantCode,
                    StartedAtUtc = StartedAtUtc,
                    DeadlineUtc = DeadlineUtc,
                    Status = Status,
                    AnsweredCount = AnsweredCount,
                    TotalQuestions = TotalQuestions,
                    TotalRiskScore = TotalRiskScore,
                    RiskLevel = RiskLevel,
                    ViolationsCount = ViolationsCount,
                    LatestSnapshotUrl = LatestSnapshotUrl,
                    WebcamActive = WebcamActive,
                    LastHeartbeatUtc = LastHeartbeatUtc,
                    IsOnline = ConnectionIds.Count > 0
                };
            }
        }
    }

    private readonly ConcurrentDictionary<Guid, SessionState> _sessions = new();
    private readonly ConcurrentDictionary<string, Guid> _connectionToSession = new();

    public LiveSessionMonitorDto InitSession(InitLiveSessionRequest req, int existingRiskScore = 0, RiskLevel existingRiskLevel = RiskLevel.Safe, int existingViolations = 0, string? latestSnapshotUrl = null)
    {
        var state = _sessions.AddOrUpdate(
            req.SessionId,
            _ => new SessionState
            {
                SessionId = req.SessionId,
                ExamId = req.ExamId,
                StudentId = req.StudentId,
                StudentName = req.StudentName,
                StudentEmail = req.StudentEmail,
                ExamVariantCode = req.ExamVariantCode,
                StartedAtUtc = req.StartedAtUtc,
                DeadlineUtc = req.DeadlineUtc,
                Status = SessionStatus.InProgress,
                TotalQuestions = req.TotalQuestions,
                TotalRiskScore = existingRiskScore,
                RiskLevel = existingRiskLevel,
                ViolationsCount = existingViolations,
                LatestSnapshotUrl = latestSnapshotUrl,
                LastHeartbeatUtc = DateTime.UtcNow
            },
            (_, existing) =>
            {
                lock (existing.SyncLock)
                {
                    existing.ExamId = req.ExamId;
                    existing.StudentName = string.IsNullOrWhiteSpace(req.StudentName) ? existing.StudentName : req.StudentName;
                    existing.StudentEmail = string.IsNullOrWhiteSpace(req.StudentEmail) ? existing.StudentEmail : req.StudentEmail;
                    existing.ExamVariantCode = string.IsNullOrWhiteSpace(req.ExamVariantCode) ? existing.ExamVariantCode : req.ExamVariantCode;
                    existing.TotalQuestions = req.TotalQuestions > 0 ? req.TotalQuestions : existing.TotalQuestions;
                    existing.DeadlineUtc = req.DeadlineUtc;
                    existing.LastHeartbeatUtc = DateTime.UtcNow;
                }
                return existing;
            });

        return state.ToDto();
    }

    public LiveSessionMonitorDto OnStudentConnected(
        Guid examId,
        Guid sessionId,
        Guid studentId,
        string studentName,
        int totalQuestions,
        string connectionId,
        int riskScore = 0,
        RiskLevel riskLevel = RiskLevel.Safe,
        int violationsCount = 0,
        string? latestSnapshotUrl = null)
    {
        var state = _sessions.GetOrAdd(sessionId, _ => new SessionState
        {
            SessionId = sessionId,
            ExamId = examId,
            StudentId = studentId,
            StudentName = studentName,
            StartedAtUtc = DateTime.UtcNow,
            DeadlineUtc = DateTime.UtcNow.AddMinutes(60),
            TotalQuestions = totalQuestions,
            TotalRiskScore = riskScore,
            RiskLevel = riskLevel,
            ViolationsCount = violationsCount,
            LatestSnapshotUrl = latestSnapshotUrl
        });

        lock (state.SyncLock)
        {
            state.ExamId = examId;
            if (!string.IsNullOrWhiteSpace(studentName)) state.StudentName = studentName;
            if (totalQuestions > 0) state.TotalQuestions = totalQuestions;
            state.ConnectionIds.Add(connectionId);
            state.LastHeartbeatUtc = DateTime.UtcNow;
            if (riskScore > state.TotalRiskScore) state.TotalRiskScore = riskScore;
            if (riskLevel > state.RiskLevel) state.RiskLevel = riskLevel;
            if (violationsCount > state.ViolationsCount) state.ViolationsCount = violationsCount;
            if (!string.IsNullOrEmpty(latestSnapshotUrl) && string.IsNullOrEmpty(state.LatestSnapshotUrl))
                state.LatestSnapshotUrl = latestSnapshotUrl;
        }

        _connectionToSession[connectionId] = sessionId;
        return state.ToDto();
    }

    public (Guid ExamId, Guid SessionId, bool IsOnline)? OnConnectionDisconnected(string connectionId)
    {
        if (!_connectionToSession.TryRemove(connectionId, out var sessionId))
            return null;

        if (!_sessions.TryGetValue(sessionId, out var state))
            return null;

        bool isOnline;
        Guid examId;
        lock (state.SyncLock)
        {
            state.ConnectionIds.Remove(connectionId);
            isOnline = state.ConnectionIds.Count > 0;
            examId = state.ExamId;
        }

        return (examId, sessionId, isOnline);
    }

    public LiveSessionMonitorDto? UpdateProgress(Guid sessionId, int answeredCount, int totalQuestions, bool webcamActive)
    {
        if (!_sessions.TryGetValue(sessionId, out var state))
            return null;

        lock (state.SyncLock)
        {
            state.AnsweredCount = answeredCount;
            if (totalQuestions > 0) state.TotalQuestions = totalQuestions;
            state.WebcamActive = webcamActive;
            state.LastHeartbeatUtc = DateTime.UtcNow;
        }

        return state.ToDto();
    }

    public LiveSessionMonitorDto? UpdateViolation(Guid sessionId, Guid? examId, int totalRiskScore, RiskLevel riskLevel, int violationsCount)
    {
        if (!_sessions.TryGetValue(sessionId, out var state))
            return null;

        lock (state.SyncLock)
        {
            if (examId.HasValue) state.ExamId = examId.Value;
            state.TotalRiskScore = totalRiskScore;
            state.RiskLevel = riskLevel;
            state.ViolationsCount = violationsCount;
            state.LastHeartbeatUtc = DateTime.UtcNow;
        }

        return state.ToDto();
    }

    public LiveSessionMonitorDto? UpdateSnapshot(Guid sessionId, string imageUrl)
    {
        if (!_sessions.TryGetValue(sessionId, out var state))
            return null;

        lock (state.SyncLock)
        {
            state.LatestSnapshotUrl = imageUrl;
            state.WebcamActive = true;
            state.LastHeartbeatUtc = DateTime.UtcNow;
        }

        return state.ToDto();
    }

    public LiveSessionMonitorDto? MarkStatus(Guid sessionId, SessionStatus status)
    {
        if (!_sessions.TryGetValue(sessionId, out var state))
            return null;

        lock (state.SyncLock)
        {
            state.Status = status;
            state.LastHeartbeatUtc = DateTime.UtcNow;
        }

        return state.ToDto();
    }

    public Guid? GetExamId(Guid sessionId)
    {
        return _sessions.TryGetValue(sessionId, out var state) ? state.ExamId : null;
    }

    public List<LiveSessionMonitorDto> GetSessionsByExam(Guid examId)
    {
        var cutoff = DateTime.UtcNow.AddHours(-12);
        return _sessions.Values
            .Select(s => s.ToDto())
            .Where(s => s.ExamId == examId && s.StartedAtUtc >= cutoff)
            .OrderBy(s => s.Status == SessionStatus.InProgress ? 0 : 1)
            .ThenByDescending(s => s.TotalRiskScore)
            .ThenBy(s => s.StudentName)
            .ToList();
    }
}
