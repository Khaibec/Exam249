using Exam249.Shared.Contracts.Enums;

namespace Exam249.Shared.Common.Utilities;

public static class AntiCheatRiskCalculator
{
    public static int GetPenaltyPoints(ViolationType type)
    {
        return type switch
        {
            ViolationType.FullscreenExit => 20,
            ViolationType.TabSwitch => 15,
            ViolationType.BlurLoss => 10,
            ViolationType.CopyPaste => 15,
            ViolationType.DevToolsShortcut => 25,
            ViolationType.MultipleSessions => 50,
            ViolationType.RapidAnswer => 20,
            _ => 10
        };
    }

    public static RiskLevel CalculateRiskLevel(int totalScore)
    {
        return totalScore switch
        {
            <= 20 => RiskLevel.Safe,
            <= 50 => RiskLevel.Suspicious,
            <= 75 => RiskLevel.HighRisk,
            _ => RiskLevel.Critical
        };
    }

    public static string GetViolationNameVi(ViolationType type)
    {
        return type switch
        {
            ViolationType.FullscreenExit => "Thoát chế độ toàn màn hình",
            ViolationType.TabSwitch => "Chuyển tab hoặc ứng dụng khác",
            ViolationType.BlurLoss => "Mất tiêu điểm cửa sổ làm bài",
            ViolationType.CopyPaste => "Cố tình sao chép / dán nội dung",
            ViolationType.DevToolsShortcut => "Cố gắng mở DevTools / phím tắt cấm",
            ViolationType.MultipleSessions => "Đăng nhập đồng thời nhiều thiết bị",
            ViolationType.RapidAnswer => "Tốc độ trả lời bất thường (< 1 giây)",
            _ => "Hành vi bất thường"
        };
    }
}
