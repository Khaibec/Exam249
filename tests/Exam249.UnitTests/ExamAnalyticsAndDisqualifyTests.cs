using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Exam249.ExamService.Controllers;
using Exam249.ExamService.Data;
using Exam249.ExamService.Entities;
using Exam249.ExamService.Services;
using Exam249.ReportingService.Consumers;
using Exam249.ReportingService.Data;
using Exam249.Shared.Common.Security;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;
using Exam249.Shared.Contracts.Events;
using MassTransit;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Exam249.UnitTests;

public class ExamAnalyticsAndDisqualifyTests
{
    private class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;
        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler) => _handler = handler;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(_handler(request));
    }

    private class NoopPublishEndpoint : IPublishEndpoint
    {
        public ConnectHandle ConnectPublishObserver(IPublishObserver observer) => new DummyHandle();
        public Task Publish<T>(T message, CancellationToken cancellationToken = default) where T : class => Task.CompletedTask;
        public Task Publish<T>(T message, IPipe<PublishContext<T>> publishPipe, CancellationToken cancellationToken = default) where T : class => Task.CompletedTask;
        public Task Publish<T>(T message, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) where T : class => Task.CompletedTask;
        public Task Publish(object message, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Publish(object message, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Publish(object message, Type messageType, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Publish(object message, Type messageType, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Publish<T>(object values, CancellationToken cancellationToken = default) where T : class => Task.CompletedTask;
        public Task Publish<T>(object values, IPipe<PublishContext<T>> publishPipe, CancellationToken cancellationToken = default) where T : class => Task.CompletedTask;
        public Task Publish<T>(object values, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) where T : class => Task.CompletedTask;
        private class DummyHandle : ConnectHandle { public void Disconnect() { } public void Dispose() { } }
    }

    private class FakeConsumeContext<T> : ConsumeContext<T> where T : class
    {
        public FakeConsumeContext(T message) => Message = message;
        public T Message { get; }
        public Guid? MessageId => Guid.NewGuid();
        public Guid? RequestId => null;
        public Guid? CorrelationId => null;
        public Guid? ConversationId => null;
        public Guid? InitiatorId => null;
        public DateTime? ExpirationTime => null;
        public Uri? SourceAddress => null;
        public Uri? DestinationAddress => null;
        public Uri? ResponseAddress => null;
        public Uri? FaultAddress => null;
        public DateTime? SentTime => DateTime.UtcNow;
        public Headers Headers => throw new NotImplementedException();
        public HostInfo Host => throw new NotImplementedException();
        public IEnumerable<string> SupportedMessageTypes => Array.Empty<string>();
        public CancellationToken CancellationToken => CancellationToken.None;
        public ReceiveContext ReceiveContext => throw new NotImplementedException();
        public SerializerContext SerializerContext => throw new NotImplementedException();
        public Task ConsumeCompleted => Task.CompletedTask;
        public void AddConsumeTask(Task task) { }
        public Task RespondAsync<T1>(T1 message) where T1 : class => Task.CompletedTask;
        public Task RespondAsync<T1>(T1 message, IPipe<SendContext<T1>> sendPipe) where T1 : class => Task.CompletedTask;
        public Task RespondAsync<T1>(T1 message, IPipe<SendContext> sendPipe) where T1 : class => Task.CompletedTask;
        public Task RespondAsync(object message) => Task.CompletedTask;
        public Task RespondAsync(object message, Type messageType) => Task.CompletedTask;
        public Task RespondAsync(object message, IPipe<SendContext> sendPipe) => Task.CompletedTask;
        public Task RespondAsync(object message, Type messageType, IPipe<SendContext> sendPipe) => Task.CompletedTask;
        public Task RespondAsync<T1>(object values) where T1 : class => Task.CompletedTask;
        public Task RespondAsync<T1>(object values, IPipe<SendContext<T1>> sendPipe) where T1 : class => Task.CompletedTask;
        public Task RespondAsync<T1>(object values, IPipe<SendContext> sendPipe) where T1 : class => Task.CompletedTask;
        public void Respond<T1>(T1 message) where T1 : class { }
        public Task<ISendEndpoint> GetSendEndpoint(Uri address) => throw new NotImplementedException();
        public Task NotifyConsumed<T1>(ConsumeContext<T1> context, TimeSpan duration, string consumerType) where T1 : class => Task.CompletedTask;
        public Task NotifyFaulted<T1>(ConsumeContext<T1> context, TimeSpan duration, string consumerType, Exception exception) where T1 : class => Task.CompletedTask;
        public Task NotifyConsumed(TimeSpan duration, string consumerType) => Task.CompletedTask;
        public Task NotifyFaulted(TimeSpan duration, string consumerType, Exception exception) => Task.CompletedTask;
        public bool TryGetMessage<T1>([System.Diagnostics.CodeAnalysis.NotNullWhen(true)] out ConsumeContext<T1>? consumeContext) where T1 : class { consumeContext = null; return false; }
        public bool HasMessageType(Type messageType) => false;
        public bool HasPayloadType(Type payloadType) => false;
        public bool TryGetPayload<TPayload>(out TPayload payload) where TPayload : class { payload = null!; return false; }
        public TPayload GetOrAddPayload<TPayload>(PayloadFactory<TPayload> payloadFactory) where TPayload : class => payloadFactory();
        public TPayload AddOrUpdatePayload<TPayload>(PayloadFactory<TPayload> addFactory, UpdatePayloadFactory<TPayload> updateFactory) where TPayload : class => addFactory();
        public ConnectHandle ConnectPublishObserver(IPublishObserver observer) => throw new NotImplementedException();
        public Task Publish<T1>(T1 message, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
        public Task Publish<T1>(T1 message, IPipe<PublishContext<T1>> publishPipe, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
        public Task Publish<T1>(T1 message, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
        public Task Publish(object message, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Publish(object message, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Publish(object message, Type messageType, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Publish(object message, Type messageType, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Publish<T1>(object values, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
        public Task Publish<T1>(object values, IPipe<PublishContext<T1>> publishPipe, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
        public Task Publish<T1>(object values, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
        public ConnectHandle ConnectSendObserver(ISendObserver observer) => throw new NotImplementedException();
        public Task Send<T1>(Uri destinationAddress, T1 message, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
        public Task Send<T1>(Uri destinationAddress, T1 message, IPipe<SendContext<T1>> sendPipe, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
        public Task Send<T1>(Uri destinationAddress, T1 message, IPipe<SendContext> sendPipe, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
        public Task Send(Uri destinationAddress, object message, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Send(Uri destinationAddress, object message, IPipe<SendContext> sendPipe, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Send(Uri destinationAddress, object message, Type messageType, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Send(Uri destinationAddress, object message, Type messageType, IPipe<SendContext> sendPipe, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task Send<T1>(Uri destinationAddress, object values, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
        public Task Send<T1>(Uri destinationAddress, object values, IPipe<SendContext<T1>> sendPipe, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
        public Task Send<T1>(Uri destinationAddress, object values, IPipe<SendContext> sendPipe, CancellationToken cancellationToken = default) where T1 : class => Task.CompletedTask;
    }

    private static ExamDbContext CreateExamContext()
    {
        var options = new DbContextOptionsBuilder<ExamDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ExamDbContext(options);
    }

    private static IConfiguration BuildDefaultConfig() => new ConfigurationBuilder().Build();

    [Fact]
    public async Task GetInternalExamAnalytics_ShouldComputeRealBucketsAndPassRate()
    {
        using var db = CreateExamContext();
        var examId = Guid.NewGuid();
        db.Exams.Add(new Exam
        {
            Id = examId,
            Title = "Kiểm tra Toán",
            ClassroomName = "12A1",
            PassingScore = 5.0
        });

        var scores = new[] { 9.0, 7.5, 6.0, 3.0 }; // 1 excellent, 1 good, 1 avg, 1 weak; 3 passed
        foreach (var score in scores)
        {
            var sid = Guid.NewGuid();
            db.ExamSessions.Add(new ExamSession { Id = sid, ExamId = examId, StudentId = Guid.NewGuid(), Status = SessionStatus.Submitted });
            db.ExamSubmissions.Add(new ExamSubmission
            {
                ExamSessionId = sid,
                ExamId = examId,
                StudentId = Guid.NewGuid(),
                TotalScore = score,
                MaxScore = 10.0,
                IsPassed = score >= 5.0,
                RiskLevel = score < 5.0 ? RiskLevel.HighRisk : RiskLevel.Safe
            });
        }
        await db.SaveChangesAsync();

        var emptyHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(ApiResponse<List<RiskScoreSummaryDto>>.Ok(new())), Encoding.UTF8, "application/json")
        });
        var config = BuildDefaultConfig();
        var antiCheatClient = new AntiCheatClient(new HttpClient(emptyHandler), config, NullLogger<AntiCheatClient>.Instance);
        var classroomClient = new ClassroomClient(new HttpClient(emptyHandler), config, NullLogger<ClassroomClient>.Instance);
        var bankClient = new QuestionBankClient(new HttpClient(emptyHandler), config, NullLogger<QuestionBankClient>.Instance);

        var controller = new ExamsController(db, antiCheatClient, classroomClient, bankClient, config);
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers[InternalSecurityConstants.HeaderName] = InternalSecurityConstants.DefaultSecretKey;
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var actionResult = await controller.GetInternalExamAnalytics(examId);
        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        var payload = Assert.IsType<ApiResponse<ExamAnalyticsDto>>(okResult.Value);
        var data = payload.Data!;

        Assert.Equal(4, data.TotalSubmissions);
        Assert.Equal(6.38, data.AverageScore);
        Assert.Equal(9.0, data.HighestScore);
        Assert.Equal(3.0, data.LowestScore);
        Assert.Equal(75.0, data.PassRate);
        Assert.Equal(1, data.ExcellentCount);
        Assert.Equal(1, data.GoodCount);
        Assert.Equal(1, data.AverageCount);
        Assert.Equal(1, data.WeakCount);
        Assert.Equal(1, data.HighRiskCount);
    }

    [Fact]
    public async Task DisqualifySession_ShouldBlockAutosaveAndSubmit()
    {
        using var db = CreateExamContext();
        var teacherId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        var examId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        db.Exams.Add(new Exam { Id = examId, TeacherId = teacherId, Title = "Exam 1" });
        db.ExamSessions.Add(new ExamSession
        {
            Id = sessionId,
            ExamId = examId,
            StudentId = studentId,
            Status = SessionStatus.InProgress,
            DeadlineUtc = DateTime.UtcNow.AddMinutes(30)
        });
        await db.SaveChangesAsync();

        var okHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"success\":true}", Encoding.UTF8, "application/json")
        });
        var config = BuildDefaultConfig();
        var bankClient = new QuestionBankClient(new HttpClient(okHandler), config, NullLogger<QuestionBankClient>.Instance);
        var antiCheatClient = new AntiCheatClient(new HttpClient(okHandler), config, NullLogger<AntiCheatClient>.Instance);
        var classroomClient = new ClassroomClient(new HttpClient(okHandler), config, NullLogger<ClassroomClient>.Instance);

        var controller = new ExamSessionsController(db, bankClient, antiCheatClient, classroomClient, new NoopPublishEndpoint(), NullLogger<ExamSessionsController>.Instance);

        // Teacher disqualifies
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, teacherId.ToString()),
                    new Claim(ClaimTypes.Role, "Teacher")
                }, "test"))
            }
        };

        var disqResult = await controller.DisqualifySession(sessionId, new DisqualifySessionRequest { Reason = "Chuyển tab 5 lần" });
        Assert.IsType<OkObjectResult>(disqResult.Result);

        var savedSession = await db.ExamSessions.FindAsync(sessionId);
        Assert.Equal(SessionStatus.Disqualified, savedSession!.Status);
        Assert.Equal("Chuyển tab 5 lần", savedSession.DisqualificationReason);

        // Student attempts autosave and submit -> both rejected
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, studentId.ToString()),
                    new Claim(ClaimTypes.Role, "Student")
                }, "test"))
            }
        };

        var autosaveRes = await controller.Autosave(sessionId, new AutosaveAnswersRequest());
        Assert.IsType<BadRequestObjectResult>(autosaveRes.Result);

        var submitRes = await controller.SubmitExam(sessionId, new SubmitExamRequest());
        Assert.IsType<BadRequestObjectResult>(submitRes.Result);
    }

    [Fact]
    public async Task ExamSubmittedConsumer_ShouldPersistExamTitleAndClassroomName()
    {
        var options = new DbContextOptionsBuilder<ReportingDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var db = new ReportingDbContext(options);

        var consumer = new ExamSubmittedConsumer(db, NullLogger<ExamSubmittedConsumer>.Instance);
        var examId = Guid.NewGuid();
        var evt = new ExamSubmittedEvent(
            Guid.NewGuid(),
            examId,
            Guid.NewGuid(),
            "Trần Minh Quang",
            8.5,
            10.0,
            true,
            15,
            RiskLevel.Safe,
            DateTime.UtcNow.AddMinutes(-10),
            DateTime.UtcNow,
            "Kiểm tra C#",
            "CNTT01");

        await consumer.Consume(new FakeConsumeContext<ExamSubmittedEvent>(evt));

        var snapshot = await db.ExamReportSnapshots.FirstOrDefaultAsync(s => s.ExamId == examId);
        Assert.NotNull(snapshot);
        Assert.Equal("Kiểm tra C#", snapshot!.ExamTitle);
        Assert.Equal("CNTT01", snapshot.ClassroomName);
        Assert.Equal(1, snapshot.TotalSubmissions);
        Assert.Equal(8.5, snapshot.AverageScore);
        Assert.Single(db.SystemAuditLogs);
    }
}
