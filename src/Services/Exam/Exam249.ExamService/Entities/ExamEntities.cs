using Exam249.Shared.Common.Entities;
using Exam249.Shared.Contracts.Enums;

namespace Exam249.ExamService.Entities;

public class Exam : BaseEntity
{
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
    public int DurationMinutes { get; set; } = 45;
    public double PassingScore { get; set; } = 5.0;
    public int MaxAttempts { get; set; } = 1;
    public bool ShuffleQuestions { get; set; } = true;
    public bool ShuffleOptions { get; set; } = true;
    public bool ShowResultsImmediately { get; set; } = true;
    public bool AllowReview { get; set; } = true;
    public ExamStatus Status { get; set; } = ExamStatus.Published;

    public ICollection<ExamQuestion> Questions { get; set; } = new List<ExamQuestion>();
    public ICollection<ExamSession> Sessions { get; set; } = new List<ExamSession>();
}

public class ExamQuestion : BaseEntity
{
    public Guid ExamId { get; set; }
    public Exam Exam { get; set; } = null!;
    public Guid QuestionId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public QuestionType Type { get; set; }
    public DifficultyLevel Difficulty { get; set; }
    public double Points { get; set; } = 1.0;
    public int OrderIndex { get; set; }
}

public class ExamSession : BaseEntity
{
    public Guid ExamId { get; set; }
    public Exam Exam { get; set; } = null!;
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime DeadlineUtc { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public SessionStatus Status { get; set; } = SessionStatus.InProgress;
    public string ExamVariantCode { get; set; } = "101";

    public double TotalScore { get; set; }
    public double MaxScore { get; set; }
    public bool IsPassed { get; set; }

    public int RiskScore { get; set; } = 0;
    public RiskLevel RiskLevel { get; set; } = RiskLevel.Safe;

    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    public ICollection<ExamSessionAnswer> CurrentAnswers { get; set; } = new List<ExamSessionAnswer>();
    public ExamSubmission? Submission { get; set; }
}

public class ExamSessionAnswer : BaseEntity
{
    public Guid ExamSessionId { get; set; }
    public ExamSession ExamSession { get; set; } = null!;
    public Guid QuestionId { get; set; }
    public string SelectedOptionIdsJson { get; set; } = "[]"; // List<Guid> serialized
    public string? TextAnswer { get; set; }
    public bool IsFlagged { get; set; }
}

public class ExamSubmission : BaseEntity
{
    public Guid ExamSessionId { get; set; }
    public ExamSession ExamSession { get; set; } = null!;
    public Guid ExamId { get; set; }
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

    public ICollection<ExamSubmissionDetail> Details { get; set; } = new List<ExamSubmissionDetail>();
}

public class ExamSubmissionDetail : BaseEntity
{
    public Guid ExamSubmissionId { get; set; }
    public ExamSubmission ExamSubmission { get; set; } = null!;
    public Guid QuestionId { get; set; }
    public string QuestionContent { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public double PointsAwarded { get; set; }
    public double MaxPoints { get; set; }
    public bool IsCorrect { get; set; }
    public string SelectedOptionIdsJson { get; set; } = "[]";
    public string? TextAnswer { get; set; }
    public string CorrectOptionIdsJson { get; set; } = "[]";
    public string AcceptedAnswersJson { get; set; } = "[]";
    public string? Explanation { get; set; }
}
