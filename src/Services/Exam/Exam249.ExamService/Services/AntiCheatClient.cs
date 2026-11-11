using System.Net.Http.Json;
using Exam249.Shared.Common.Security;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Exam249.ExamService.Services;

public class AntiCheatClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AntiCheatClient> _logger;

    public AntiCheatClient(HttpClient httpClient, IConfiguration configuration, ILogger<AntiCheatClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        var baseUrl = configuration["Services:AntiCheatUrl"] ?? "http://localhost:5005";
        _httpClient.BaseAddress = new Uri(baseUrl);

        var internalSecret = configuration["InternalSecurity:SecretKey"] ?? InternalSecurityConstants.DefaultSecretKey;
        if (!_httpClient.DefaultRequestHeaders.Contains(InternalSecurityConstants.HeaderName))
        {
            _httpClient.DefaultRequestHeaders.Add(InternalSecurityConstants.HeaderName, internalSecret);
        }
    }

    public async Task<RiskScoreSummaryDto?> GetSessionSummaryAsync(Guid sessionId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/anticheat/sessions/{sessionId}/summary");
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<ApiResponse<RiskScoreSummaryDto>>();
                if (result?.Success == true && result.Data != null)
                {
                    return result.Data;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get session risk summary from AntiCheatService for session {SessionId}", sessionId);
        }

        return null;
    }

    public async Task<List<RiskScoreSummaryDto>> GetBatchSessionSummariesAsync(List<Guid> sessionIds)
    {
        if (sessionIds == null || !sessionIds.Any())
            return new List<RiskScoreSummaryDto>();

        try
        {
            var response = await _httpClient.PostAsJsonAsync("/api/anticheat/sessions/batch-summary", sessionIds);
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<ApiResponse<List<RiskScoreSummaryDto>>>();
                if (result?.Success == true && result.Data != null)
                {
                    return result.Data;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get batch session summaries from AntiCheatService");
        }

        return new List<RiskScoreSummaryDto>();
    }

    public async Task InitLiveSessionAsync(InitLiveSessionRequest request)
    {
        try
        {
            await _httpClient.PostAsJsonAsync("/api/anticheat/internal/live-sessions/init", request);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to init live session in AntiCheatService for {SessionId}", request.SessionId);
        }
    }

    public async Task NotifySessionSubmittedAsync(Guid sessionId, Guid examId)
    {
        try
        {
            await _httpClient.PostAsync($"/api/anticheat/internal/live-sessions/{sessionId}/submitted?examId={examId}", null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to notify session submitted to AntiCheatService for {SessionId}", sessionId);
        }
    }

    public async Task NotifySessionDisqualifiedAsync(Guid sessionId, Guid examId, string reason)
    {
        try
        {
            await _httpClient.PostAsJsonAsync($"/api/anticheat/internal/live-sessions/{sessionId}/disqualified?examId={examId}", new DisqualifySessionRequest { Reason = reason });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to notify session disqualified to AntiCheatService for {SessionId}", sessionId);
        }
    }

    public async Task<RiskScoreSummaryDto?> RecordInternalViolationAsync(InternalViolationRequest request)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("/api/anticheat/internal/violations", request);
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<ApiResponse<RiskScoreSummaryDto>>();
                return result?.Data;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to record internal violation for session {SessionId}", request.SessionId);
        }

        return null;
    }
}
