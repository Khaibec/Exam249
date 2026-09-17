using Exam249.Shared.Contracts.Enums;

namespace Exam249.Shared.Contracts.DTOs;

public class QuestionDto
{
    public Guid Id { get; set; }
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public QuestionType Type { get; set; }
    public DifficultyLevel Difficulty { get; set; }
    public double DefaultPoints { get; set; } = 1.0;
    public string? Explanation { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<QuestionOptionDto> Options { get; set; } = new();
    public List<string> AcceptedAnswers { get; set; } = new(); // For FillInTheBlank
    public DateTime CreatedAtUtc { get; set; }
}

public class QuestionOptionDto
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int OrderIndex { get; set; }
}

public class CreateQuestionRequest
{
    public Guid SubjectId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public QuestionType Type { get; set; }
    public DifficultyLevel Difficulty { get; set; }
    public double DefaultPoints { get; set; } = 1.0;
    public string? Explanation { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<CreateQuestionOptionRequest> Options { get; set; } = new();
    public List<string> AcceptedAnswers { get; set; } = new();
}

public class CreateQuestionOptionRequest
{
    public string Content { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int OrderIndex { get; set; }
}

public class UpdateQuestionRequest : CreateQuestionRequest
{
}

public class QuestionFilterRequest
{
    public Guid? SubjectId { get; set; }
    public QuestionType? Type { get; set; }
    public DifficultyLevel? Difficulty { get; set; }
    public string? Keyword { get; set; }
    public string? Tag { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
