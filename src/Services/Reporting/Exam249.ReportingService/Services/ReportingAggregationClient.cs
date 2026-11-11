using System.Net.Http.Json;
using Exam249.Shared.Common.Security;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Exam249.ReportingService.Services;

public class ReportingAggregationClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ReportingAggregationClient> _logger;

    private string IdentityUrl => _configuration["Services:IdentityUrl"] ?? "http://localhost:5001";
    private string ClassroomUrl => _configuration["Services:ClassroomUrl"] ?? "http://localhost:5002";
    private string QuestionBankUrl => _configuration["Services:QuestionBankUrl"] ?? "http://localhost:5003";
    private string ExamUrl => _configuration["Services:ExamUrl"] ?? "http://localhost:5004";
    private string InternalSecret => _configuration["InternalSecurity:SecretKey"] ?? InternalSecurityConstants.DefaultSecretKey;

    public ReportingAggregationClient(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<ReportingAggregationClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    private async Task<T?> GetInternalAsync<T>(string baseUrl, string path)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(baseUrl);
            client.DefaultRequestHeaders.Add(InternalSecurityConstants.HeaderName, InternalSecret);

            var response = await client.GetAsync(path);
            if (response.IsSuccessStatusCode)
            {
                var wrapper = await response.Content.ReadFromJsonAsync<ApiResponse<T>>();
                if (wrapper?.Success == true)
                {
                    return wrapper.Data;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to call internal reporting endpoint {BaseUrl}{Path}", baseUrl, path);
        }

        return default;
    }

    public Task<IdentityStatsDto?> GetIdentityStatsAsync()
        => GetInternalAsync<IdentityStatsDto>(IdentityUrl, "/api/users/internal/stats");

    public Task<ClassroomStatsDto?> GetClassroomStatsAsync(Guid? teacherId = null)
    {
        var query = teacherId.HasValue ? $"?teacherId={teacherId.Value}" : string.Empty;
        return GetInternalAsync<ClassroomStatsDto>(ClassroomUrl, $"/api/classrooms/internal/stats{query}");
    }

    public Task<List<Guid>?> GetStudentClassroomIdsAsync(Guid studentId)
        => GetInternalAsync<List<Guid>>(ClassroomUrl, $"/api/classrooms/my-enrolled-ids?studentId={studentId}");

    public Task<int> GetQuestionsCountAsync()
        => GetInternalAsync<int>(QuestionBankUrl, "/api/questions/internal/count");

    public Task<ExamOverviewStatsDto?> GetExamOverviewAsync(Guid? teacherId = null)
    {
        var query = teacherId.HasValue ? $"?teacherId={teacherId.Value}" : string.Empty;
        return GetInternalAsync<ExamOverviewStatsDto>(ExamUrl, $"/api/exams/internal/overview{query}");
    }

    public Task<StudentExamOverviewDto?> GetStudentExamOverviewAsync(Guid studentId)
        => GetInternalAsync<StudentExamOverviewDto>(ExamUrl, $"/api/exams/internal/student-overview?studentId={studentId}");

    public Task<ExamAnalyticsDto?> GetExamAnalyticsAsync(Guid examId)
        => GetInternalAsync<ExamAnalyticsDto>(ExamUrl, $"/api/exams/internal/{examId}/analytics");
}
