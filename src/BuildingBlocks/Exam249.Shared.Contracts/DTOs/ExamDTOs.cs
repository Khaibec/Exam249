using Exam249.Shared.Contracts.Enums;

namespace Exam249.Shared.Contracts.DTOs;

public class ExamDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public Guid ClassroomId { get; set; }
    public string ClassroomName { get; set; } = string.Empty;
    public Guid TeacherId { get; set; }
    public string TeacherName { get; set; } = string.Empty;
    public DateTime StartTimeUtc { get; set; }
    public DateTime EndTimeUtc { get; set; }
    public int DurationMinutes { get; set; }
    public double PassingScore { get; set; }
    public int MaxAttempts { get; set; } = 1;
    public bool ShuffleQuestions { get; set; } = true;
    public bool ShuffleOptions { get; set; } = true;
    public bool ShowResultsImmediately { get; set; } = true;
    public bool AllowReview { get; set; } = true;
    public ExamStatus Status { get; set; }
    public int QuestionCount { get; set; }
    public double TotalPoints { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public List<ExamQuestionItemDto> Questions { get; set; } = new();
}

public class ExamQuestionItemDto
{
    public Guid QuestionId { get; set; }
    public string Content { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public DifficultyLevel Difficulty { get; set; }
    public double Points { get; set; } = 1.0;
    public int OrderIndex { get; set; }
}

public class CreateExamRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid SubjectId { get; set; }
    public Guid ClassroomId { get; set; }
    public DateTime StartTimeUtc { get; set; }
    public DateTime EndTimeUtc { get; set; }
    public int DurationMinutes { get; set; } = 45;
    public double PassingScore { get; set; } = 5.0;
    public int MaxAttempts { get; set; } = 1;
    public bool ShuffleQuestions { get; set; } = true;
    public bool ShuffleOptions { get; set; } = true;
    public bool ShowResultsImmediately { get; set; } = true;
    public bool AllowReview { get; set; } = true;
    public List<CreateExamQuestionItemRequest> Questions { get; set; } = new();
}

public class CreateExamQuestionItemRequest
{
    public Guid QuestionId { get; set; }
    public double Points { get; set; } = 1.0;
    public int OrderIndex { get; set; }
}

public class UpdateExamRequest : CreateExamRequest
{
    public ExamStatus Status { get; set; }
}

// Student View DTOs (Secured - ZERO correct answers leaked)
public class StudentExamViewDto
{
    public Guid SessionId { get; set; }
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public string ClassroomName { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime DeadlineUtc { get; set; }
    public int RemainingSeconds { get; set; }
    public string ExamVariantCode { get; set; } = "101";
    public List<StudentQuestionDto> Questions { get; set; } = new();
    public List<StudentAnswerItemDto> CurrentAnswers { get; set; } = new();
}

public class StudentQuestionDto
{
    public Guid QuestionId { get; set; }
    public int OrderIndex { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public QuestionType Type { get; set; }
    public double Points { get; set; }
    public List<StudentOptionDto> Options { get; set; } = new(); // Sorted according to shuffle, NO IsCorrect field!
}

public class StudentOptionDto
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
}

public class StudentAnswerItemDto
{
    public Guid QuestionId { get; set; }
    public List<Guid> SelectedOptionIds { get; set; } = new();
    public string? TextAnswer { get; set; }
    public bool IsFlagged { get; set; }
}

public class AutosaveAnswersRequest
{
    public List<StudentAnswerItemDto> Answers { get; set; } = new();
}

public class SubmitExamRequest
{
    public List<StudentAnswerItemDto> Answers { get; set; } = new();
}

// Result DTOs
public class ExamResultDto
{
    public Guid SessionId { get; set; }
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public DateTime StartedAtUtc { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
    public int DurationSeconds { get; set; }
    public double TotalScore { get; set; }
    public double MaxScore { get; set; }
    public double ScorePercentage { get; set; }
    public bool IsPassed { get; set; }
    public int RiskScore { get; set; }
    public RiskLevel RiskLevel { get; set; }
    public bool CanReview { get; set; }
    public List<SubmissionDetailDto>? Details { get; set; }
}

public class SubmissionDetailDto
{
    public Guid QuestionId { get; set; }
    public string QuestionContent { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public double PointsAwarded { get; set; }
    public double MaxPoints { get; set; }
    public bool IsCorrect { get; set; }
    public List<Guid> SelectedOptionIds { get; set; } = new();
    public string? TextAnswer { get; set; }
    public List<Guid> CorrectOptionIds { get; set; } = new();
    public List<string> AcceptedAnswers { get; set; } = new();
    public string? Explanation { get; set; }
    public List<StudentOptionDto> Options { get; set; } = new();
}

public class TeacherExamSubmissionListItemDto
{
    public Guid SessionId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public DateTime StartedAtUtc { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
    public int DurationSeconds { get; set; }
    public double TotalScore { get; set; }
    public double MaxScore { get; set; }
    public double ScorePercentage { get; set; }
    public bool IsPassed { get; set; }
    public int RiskScore { get; set; }
    public RiskLevel RiskLevel { get; set; }
    public int ViolationsCount { get; set; }
}
