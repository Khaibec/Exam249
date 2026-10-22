using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Exam249.Shared.Common.Security;

public static class InternalSecurityConstants
{
    public const string HeaderName = "X-Internal-Secret";
    public const string DefaultSecretKey = "Exam249_Internal_Service_Secret_Key_2026!#$*";

    public static bool IsValidInternalRequest(HttpRequest request, IConfiguration configuration)
    {
        var configuredSecret = configuration["InternalSecurity:SecretKey"] ?? DefaultSecretKey;
        if (request.Headers.TryGetValue(HeaderName, out var headerValue))
        {
            return string.Equals(headerValue.ToString(), configuredSecret, StringComparison.Ordinal);
        }
        return false;
    }
}
