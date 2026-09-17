namespace Exam249.Shared.Common.Security;

public class JwtOptions
{
    public const string SectionName = "Jwt";
    public string SecretKey { get; set; } = "Exam249_Super_Secure_Secret_Key_For_Production_2026!#$*";
    public string Issuer { get; set; } = "Exam249";
    public string Audience { get; set; } = "Exam249Clients";
    public int ExpiryMinutes { get; set; } = 120;
    public int RefreshTokenExpiryDays { get; set; } = 7;
}
