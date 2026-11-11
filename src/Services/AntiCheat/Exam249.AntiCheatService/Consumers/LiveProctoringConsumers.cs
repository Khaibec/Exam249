using Exam249.AntiCheatService.Hubs;
using Exam249.AntiCheatService.Services;
using Exam249.Shared.Contracts.Enums;
using Exam249.Shared.Contracts.Events;
using MassTransit;
using Microsoft.AspNetCore.SignalR;

namespace Exam249.AntiCheatService.Consumers;

public class ExamSubmittedConsumer : IConsumer<ExamSubmittedEvent>
{
    private readonly LiveProctoringRegistry _registry;
    private readonly IHubContext<ProctoringHub> _hubContext;

    public ExamSubmittedConsumer(LiveProctoringRegistry registry, IHubContext<ProctoringHub> hubContext)
    {
        _registry = registry;
        _hubContext = hubContext;
    }

    public async Task Consume(ConsumeContext<ExamSubmittedEvent> context)
    {
        var msg = context.Message;
        _registry.MarkStatus(msg.SessionId, SessionStatus.Submitted);

        await _hubContext.Clients.Group(ProctoringHub.ProctorGroup(msg.ExamId))
            .SendAsync("StudentSubmitted", new { SessionId = msg.SessionId, ExamId = msg.ExamId });
    }
}

public class SessionDisqualifiedConsumer : IConsumer<SessionDisqualifiedEvent>
{
    private readonly LiveProctoringRegistry _registry;
    private readonly IHubContext<ProctoringHub> _hubContext;

    public SessionDisqualifiedConsumer(LiveProctoringRegistry registry, IHubContext<ProctoringHub> hubContext)
    {
        _registry = registry;
        _hubContext = hubContext;
    }

    public async Task Consume(ConsumeContext<SessionDisqualifiedEvent> context)
    {
        var msg = context.Message;
        _registry.MarkStatus(msg.SessionId, SessionStatus.Disqualified);

        await _hubContext.Clients.Group(ProctoringHub.SessionGroup(msg.SessionId))
            .SendAsync("ForceDisqualified", new { SessionId = msg.SessionId, Reason = msg.Reason });

        await _hubContext.Clients.Group(ProctoringHub.ProctorGroup(msg.ExamId))
            .SendAsync("SessionDisqualified", new { SessionId = msg.SessionId, ExamId = msg.ExamId, Reason = msg.Reason });
    }
}
