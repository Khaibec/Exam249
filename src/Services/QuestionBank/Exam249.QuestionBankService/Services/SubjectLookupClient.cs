using System.Net.Http.Json;
using Exam249.Shared.Common.Security;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Exam249.QuestionBankService.Services;

public class SubjectLookupClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<SubjectLookupClient> _logger;

    public SubjectLookupClient(HttpClient httpClient, IConfiguration configuration, ILogger<SubjectLookupClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        var baseUrl = configuration["Services:ClassroomUrl"] ?? "http://localhost:5002";
        _httpClient.BaseAddress = new Uri(baseUrl);

        var internalSecret = configuration["InternalSecurity:SecretKey"] ?? InternalSecurityConstants.DefaultSecretKey;
        if (!_httpClient.DefaultRequestHeaders.Contains(InternalSecurityConstants.HeaderName))
        {
            _httpClient.DefaultRequestHeaders.Add(InternalSecurityConstants.HeaderName, internalSecret);
        }
    }

    public async Task<string?> GetSubjectNameAsync(Guid subjectId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/subjects/{subjectId}");
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<ApiResponse<SubjectDto>>();
                if (result?.Success == true && result.Data != null)
                {
                    return result.Data.Name;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resolve subject name for {SubjectId}", subjectId);
        }

        return null;
    }
}
