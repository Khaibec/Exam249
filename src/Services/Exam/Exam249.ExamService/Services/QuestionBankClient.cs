using System.Net.Http.Json;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Exam249.ExamService.Services;

public class QuestionBankClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<QuestionBankClient> _logger;

    public QuestionBankClient(HttpClient httpClient, IConfiguration configuration, ILogger<QuestionBankClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        var baseUrl = configuration["Services:QuestionBankUrl"] ?? "http://localhost:5003";
        _httpClient.BaseAddress = new Uri(baseUrl);
    }

    public async Task<List<QuestionDto>> BatchGetQuestionsAsync(List<Guid> questionIds)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("/api/questions/batch-get", questionIds);
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<ApiResponse<List<QuestionDto>>>();
                if (result?.Success == true && result.Data != null)
                {
                    return result.Data;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call QuestionBankService at {BaseAddress}", _httpClient.BaseAddress);
        }

        return new List<QuestionDto>();
    }
}
