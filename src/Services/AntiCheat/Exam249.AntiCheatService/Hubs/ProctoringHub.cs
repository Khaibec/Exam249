using System.Security.Claims;
using Exam249.AntiCheatService.Data;
using Exam249.AntiCheatService.Services;
using Exam249.Shared.Contracts.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Exam249.AntiCheatService.Hubs;

[Authorize]
public class ProctoringHub : Hub
{
    private readonly LiveProctoringRegistry _registry;
    private readonly AntiCheatDbContext _context;

    public ProctoringHub(LiveProctoringRegistry registry, AntiCheatDbContext context)
    {
        _registry = registry;
        _context = context;
    }

    public static string ProctorGroup(Guid examId) => $"proctor-{examId}";
    public static string SessionGroup(Guid sessionId) => $"session-{sessionId}";

    public async Task JoinExamAsStudent(Guid examId, Guid sessionId, int totalQuestions)
    {
        var userIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(userIdStr, out var studentId);
        var studentName = Context.User?.FindFirstValue(ClaimTypes.Name) ?? "Học sinh";

        await Groups.AddToGroupAsync(Context.ConnectionId, SessionGroup(sessionId));

        var assessment = await _context.RiskAssessments.FirstOrDefaultAsync(r => r.SessionId == sessionId);
        var latestSnapshot = await _context.ProctoringSnapshots
            .Where(s => s.SessionId == sessionId)
            .OrderByDescending(s => s.TimestampUtc)
            .Select(s => s.ImageData)
            .FirstOrDefaultAsync();

        var dto = _registry.OnStudentConnected(
            examId,
            sessionId,
            studentId,
            studentName,
            totalQuestions,
            Context.ConnectionId,
            assessment?.TotalRiskScore ?? 0,
            assessment?.RiskLevel ?? RiskLevel.Safe,
            assessment?.ViolationsCount ?? 0,
            latestSnapshot);

        await Clients.Group(ProctorGroup(examId)).SendAsync("StudentJoined", dto);
    }

    public async Task UpdateStudentProgress(Guid examId, Guid sessionId, int answeredCount, int totalQuestions, bool webcamActive)
    {
        var dto = _registry.UpdateProgress(sessionId, answeredCount, totalQuestions, webcamActive);
        if (dto != null)
        {
            await Clients.Group(ProctorGroup(examId)).SendAsync("StudentProgressUpdated", dto);
        }
    }

    [Authorize(Roles = "Teacher,Admin")]
    public async Task JoinExamAsProctor(Guid examId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, ProctorGroup(examId));

        var activeSessions = _registry.GetSessionsByExam(examId);
        await Clients.Caller.SendAsync("ActiveSessionsSnapshot", activeSessions);
    }

    public async Task LeaveExamAsProctor(Guid examId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, ProctorGroup(examId));
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var disconnected = _registry.OnConnectionDisconnected(Context.ConnectionId);
        if (disconnected.HasValue)
        {
            var (examId, sessionId, isOnline) = disconnected.Value;
            await Clients.Group(ProctorGroup(examId)).SendAsync("StudentConnectionChanged", new
            {
                SessionId = sessionId,
                IsOnline = isOnline
            });
        }

        await base.OnDisconnectedAsync(exception);
    }
}
