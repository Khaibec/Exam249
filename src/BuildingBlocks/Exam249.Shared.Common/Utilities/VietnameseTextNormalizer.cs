using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Exam249.Shared.Common.Utilities;

public static class VietnameseTextNormalizer
{
    private static readonly Regex MultipleSpacesRegex = new(@"\s+", RegexOptions.Compiled);
    private static readonly Regex TrimPunctuationRegex = new(@"^[.,;:!?\s]+|[.,;:!?\s]+$", RegexOptions.Compiled);

    /// <summary>
    /// Chuẩn hóa chuỗi văn bản: loại bỏ khoảng trắng thừa, chuyển chữ thường, loại bỏ dấu chấm/phẩy ở đầu/cuối
    /// </summary>
    public static string Normalize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        var text = input.Trim().ToLowerInvariant();
        text = MultipleSpacesRegex.Replace(text, " ");
        text = TrimPunctuationRegex.Replace(text, "");
        return text;
    }

    /// <summary>
    /// Loại bỏ dấu tiếng Việt (ví dụ: "Việt Nam" -> "viet nam")
    /// </summary>
    public static string RemoveDiacritics(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        var normalizedString = input.Normalize(NormalizationForm.FormD);
        var stringBuilder = new StringBuilder(normalizedString.Length);

        foreach (var c in normalizedString)
        {
            var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
            if (unicodeCategory != UnicodeCategory.NonSpacingMark)
            {
                // Xử lý riêng chữ Đ / đ
                if (c == 'đ' || c == 'Đ')
                {
                    stringBuilder.Append('d');
                }
                else
                {
                    stringBuilder.Append(c);
                }
            }
        }

        return stringBuilder.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }

    /// <summary>
    /// Kiểm tra câu trả lời điền từ của học sinh với danh sách đáp án được chấp nhận (AcceptedAnswers).
    /// Hỗ trợ so sánh chuẩn hóa chính xác, và so sánh không dấu nếu được cho phép.
    /// </summary>
    public static bool IsMatch(string? studentAnswer, IEnumerable<string>? acceptedAnswers, bool allowIgnoreDiacritics = true)
    {
        if (string.IsNullOrWhiteSpace(studentAnswer) || acceptedAnswers == null)
            return false;

        var normalizedStudent = Normalize(studentAnswer);
        if (string.IsNullOrEmpty(normalizedStudent))
            return false;

        var unaccentedStudent = allowIgnoreDiacritics ? RemoveDiacritics(normalizedStudent) : null;

        foreach (var accepted in acceptedAnswers)
        {
            if (string.IsNullOrWhiteSpace(accepted))
                continue;

            var normalizedAccepted = Normalize(accepted);
            if (string.Equals(normalizedStudent, normalizedAccepted, StringComparison.OrdinalIgnoreCase))
                return true;

            if (allowIgnoreDiacritics)
            {
                var unaccentedAccepted = RemoveDiacritics(normalizedAccepted);
                if (string.Equals(unaccentedStudent, unaccentedAccepted, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
        }

        return false;
    }
}
