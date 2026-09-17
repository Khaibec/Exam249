namespace Exam249.Shared.Contracts.Enums;

public enum UserRole
{
    Admin = 1,
    Teacher = 2,
    Student = 3
}

public enum QuestionType
{
    SingleChoice = 1,
    MultipleChoice = 2,
    FillInTheBlank = 3
}

public enum DifficultyLevel
{
    Easy = 1,
    Medium = 2,
    Hard = 3
}

public enum ExamStatus
{
    Draft = 1,
    Published = 2,
    Archived = 3
}

public enum SessionStatus
{
    InProgress = 1,
    Submitted = 2,
    TimedOut = 3,
    Disqualified = 4
}

public enum ViolationType
{
    TabSwitch = 1,
    FullscreenExit = 2,
    BlurLoss = 3,
    CopyPaste = 4,
    DevToolsShortcut = 5,
    MultipleSessions = 6,
    RapidAnswer = 7
}

public enum RiskLevel
{
    Safe = 1,        // 0 - 20
    Suspicious = 2,  // 21 - 50
    HighRisk = 3,    // 51 - 75
    Critical = 4     // 76 - 100
}
