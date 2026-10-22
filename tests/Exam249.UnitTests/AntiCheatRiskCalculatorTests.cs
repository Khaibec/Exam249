using Exam249.Shared.Common.Utilities;
using Exam249.Shared.Contracts.Enums;
using Xunit;

namespace Exam249.UnitTests;

public class AntiCheatRiskCalculatorTests
{
    [Theory]
    [InlineData(ViolationType.FullscreenExit, 20)]
    [InlineData(ViolationType.TabSwitch, 15)]
    [InlineData(ViolationType.BlurLoss, 10)]
    [InlineData(ViolationType.CopyPaste, 15)]
    [InlineData(ViolationType.DevToolsShortcut, 25)]
    [InlineData(ViolationType.MultipleSessions, 50)]
    [InlineData(ViolationType.RapidAnswer, 20)]
    public void GetPenaltyPoints_ShouldMatchOfficialWeights(ViolationType type, int expectedPenalty)
    {
        var penalty = AntiCheatRiskCalculator.GetPenaltyPoints(type);
        Assert.Equal(expectedPenalty, penalty);
    }

    [Theory]
    [InlineData(0, RiskLevel.Safe)]
    [InlineData(15, RiskLevel.Safe)]
    [InlineData(20, RiskLevel.Safe)]
    [InlineData(21, RiskLevel.Suspicious)]
    [InlineData(35, RiskLevel.Suspicious)]
    [InlineData(50, RiskLevel.Suspicious)]
    [InlineData(51, RiskLevel.HighRisk)]
    [InlineData(75, RiskLevel.HighRisk)]
    [InlineData(76, RiskLevel.Critical)]
    [InlineData(100, RiskLevel.Critical)]
    [InlineData(150, RiskLevel.Critical)]
    public void CalculateRiskLevel_ShouldMapAccuratelyToThresholds(int score, RiskLevel expectedLevel)
    {
        var level = AntiCheatRiskCalculator.CalculateRiskLevel(score);
        Assert.Equal(expectedLevel, level);
    }

    [Theory]
    [InlineData(ViolationType.FullscreenExit, "toàn màn hình")]
    [InlineData(ViolationType.TabSwitch, "Chuyển tab")]
    [InlineData(ViolationType.DevToolsShortcut, "DevTools")]
    public void GetViolationNameVi_ShouldReturnMeaningfulVietnameseLabel(ViolationType type, string expectedSnippet)
    {
        var name = AntiCheatRiskCalculator.GetViolationNameVi(type);
        Assert.Contains(expectedSnippet, name);
    }
}
