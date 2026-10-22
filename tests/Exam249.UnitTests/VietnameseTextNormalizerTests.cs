using Exam249.Shared.Common.Utilities;
using Xunit;

namespace Exam249.UnitTests;

public class VietnameseTextNormalizerTests
{
    [Theory]
    [InlineData("  Xin   chào   Việt  Nam!  ", "xin chào việt nam")]
    [InlineData("...Hà Nội,,,", "hà nội")]
    [InlineData("Microservices & .NET", "microservices & .net")]
    [InlineData("", "")]
    [InlineData(null, "")]
    public void Normalize_ShouldNormalizeWhitespaceAndPunctuation(string? input, string expected)
    {
        var result = VietnameseTextNormalizer.Normalize(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("Việt Nam", "viet nam")]
    [InlineData("Đại học Bách Khoa", "dai hoc bach khoa")]
    [InlineData("Điểm kiểm tra", "diem kiem tra")]
    [InlineData("ĐƯỢC RỒI ĐẤY", "duoc roi day")]
    [InlineData("Thành phố Hồ Chí Minh", "thanh pho ho chi minh")]
    public void RemoveDiacritics_ShouldStripVietnameseAccentsProperly(string input, string expected)
    {
        var result = VietnameseTextNormalizer.RemoveDiacritics(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void IsMatch_ShouldMatchWithAccentsAndWithoutAccents()
    {
        var acceptedAnswers = new List<string> { "Quang Trung", "Nguyễn Huệ" };

        Assert.True(VietnameseTextNormalizer.IsMatch("Quang Trung", acceptedAnswers));
        Assert.True(VietnameseTextNormalizer.IsMatch("quang trung", acceptedAnswers));
        Assert.True(VietnameseTextNormalizer.IsMatch("  quang   trung  ", acceptedAnswers));
        Assert.True(VietnameseTextNormalizer.IsMatch("quang trung.", acceptedAnswers));
        Assert.True(VietnameseTextNormalizer.IsMatch("nguyen hue", acceptedAnswers)); // unaccented
        Assert.True(VietnameseTextNormalizer.IsMatch("NGUYỄN HUỆ", acceptedAnswers)); // uppercase
        Assert.False(VietnameseTextNormalizer.IsMatch("Lê Lợi", acceptedAnswers));
    }
}
