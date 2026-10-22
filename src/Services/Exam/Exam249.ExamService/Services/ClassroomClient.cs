using System.Net.Http.Json;
using Exam249.Shared.Common.Security;
using Exam249.Shared.Contracts.Common;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Exam249.ExamService.Services;

public class ClassroomClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ClassroomClient> _logger;

    public ClassroomClient(HttpClient httpClient, IConfiguration configuration, ILogger<ClassroomClient> logger)
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

    public async Task<List<Guid>> GetStudentEnrolledClassroomIdsAsync(Guid studentId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/classrooms/my-enrolled-ids?studentId={studentId}");
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<ApiResponse<List<Guid>>>();
                if (result?.Success == true && result.Data != null)
                {
                    return result.Data;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch enrolled classroom IDs for student {StudentId}", studentId);
        }

        return new List<Guid>();
    }

    public async Task<bool> IsStudentEnrolledAsync(Guid classroomId, Guid studentId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/classrooms/{classroomId}/is-enrolled?studentId={studentId}");
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<ApiResponse<bool>>();
                if (result?.Success == true)
                {
                    return result.Data;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to verify classroom enrollment for student {StudentId} in classroom {ClassroomId}", studentId, classroomId);
        }

        return false;
    }
}
