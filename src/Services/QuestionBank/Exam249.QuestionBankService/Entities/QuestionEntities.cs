using Exam249.Shared.Common.Entities;
using Exam249.Shared.Contracts.Enums;

namespace Exam249.QuestionBankService.Entities;

public class Question : BaseEntity
{
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public QuestionType Type { get; set; }
    public DifficultyLevel Difficulty { get; set; } = DifficultyLevel.Medium;
    public double DefaultPoints { get; set; } = 1.0;
    public string? Explanation { get; set; }
    public string Tags { get; set; } = string.Empty; // Comma-separated tags

    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();
    public ICollection<QuestionAcceptedAnswer> AcceptedAnswers { get; set; } = new List<QuestionAcceptedAnswer>();
}

public class QuestionOption : BaseEntity
{
    public Guid QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int OrderIndex { get; set; }
}

public class QuestionAcceptedAnswer : BaseEntity
{
    public Guid QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    public string AnswerText { get; set; } = string.Empty;
}
