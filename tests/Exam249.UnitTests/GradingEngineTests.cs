using Exam249.ExamService.Entities;
using Exam249.ExamService.Services;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;
using Xunit;

namespace Exam249.UnitTests;

public class GradingEngineTests
{
    [Fact]
    public void GradeExam_SingleChoice_CorrectAnswer_ShouldAwardFullPoints()
    {
        var qId = Guid.NewGuid();
        var opt1 = Guid.NewGuid();
        var opt2 = Guid.NewGuid();

        var examQuestions = new List<ExamQuestion>
        {
            new() { QuestionId = qId, Points = 2.0, Type = QuestionType.SingleChoice, OrderIndex = 1 }
        };

        var bankQuestions = new List<QuestionDto>
        {
            new()
            {
                Id = qId,
                Type = QuestionType.SingleChoice,
                Options = new List<QuestionOptionDto>
                {
                    new() { Id = opt1, Content = "Opt 1", IsCorrect = true, OrderIndex = 1 },
                    new() { Id = opt2, Content = "Opt 2", IsCorrect = false, OrderIndex = 2 }
                }
            }
        };

        var studentAnswers = new List<StudentAnswerItemDto>
        {
            new() { QuestionId = qId, SelectedOptionIds = new List<Guid> { opt1 } }
        };

        var (totalScore, maxScore, details) = GradingEngine.GradeExam(examQuestions, bankQuestions, studentAnswers);

        Assert.Equal(2.0, totalScore);
        Assert.Equal(2.0, maxScore);
        Assert.Single(details);
        Assert.True(details[0].IsCorrect);
        Assert.Equal(2.0, details[0].PointsAwarded);
    }

    [Fact]
    public void GradeExam_SingleChoice_IncorrectAnswer_ShouldAwardZeroPoints()
    {
        var qId = Guid.NewGuid();
        var opt1 = Guid.NewGuid();
        var opt2 = Guid.NewGuid();

        var examQuestions = new List<ExamQuestion>
        {
            new() { QuestionId = qId, Points = 2.0, Type = QuestionType.SingleChoice, OrderIndex = 1 }
        };

        var bankQuestions = new List<QuestionDto>
        {
            new()
            {
                Id = qId,
                Type = QuestionType.SingleChoice,
                Options = new List<QuestionOptionDto>
                {
                    new() { Id = opt1, Content = "Opt 1", IsCorrect = true, OrderIndex = 1 },
                    new() { Id = opt2, Content = "Opt 2", IsCorrect = false, OrderIndex = 2 }
                }
            }
        };

        var studentAnswers = new List<StudentAnswerItemDto>
        {
            new() { QuestionId = qId, SelectedOptionIds = new List<Guid> { opt2 } }
        };

        var (totalScore, maxScore, details) = GradingEngine.GradeExam(examQuestions, bankQuestions, studentAnswers);

        Assert.Equal(0.0, totalScore);
        Assert.Equal(2.0, maxScore);
        Assert.Single(details);
        Assert.False(details[0].IsCorrect);
        Assert.Equal(0.0, details[0].PointsAwarded);
    }

    [Fact]
    public void GradeExam_MultipleChoice_PartialCredit_ShouldCalculateCorrectFraction()
    {
        var qId = Guid.NewGuid();
        var opt1 = Guid.NewGuid(); // Correct
        var opt2 = Guid.NewGuid(); // Correct
        var opt3 = Guid.NewGuid(); // Incorrect

        var examQuestions = new List<ExamQuestion>
        {
            new() { QuestionId = qId, Points = 4.0, Type = QuestionType.MultipleChoice, OrderIndex = 1 }
        };

        var bankQuestions = new List<QuestionDto>
        {
            new()
            {
                Id = qId,
                Type = QuestionType.MultipleChoice,
                Options = new List<QuestionOptionDto>
                {
                    new() { Id = opt1, Content = "Opt 1", IsCorrect = true, OrderIndex = 1 },
                    new() { Id = opt2, Content = "Opt 2", IsCorrect = true, OrderIndex = 2 },
                    new() { Id = opt3, Content = "Opt 3", IsCorrect = false, OrderIndex = 3 }
                }
            }
        };

        // Case A: Student selects only 1 of 2 correct answers (no incorrect selected)
        // 1/2 correct = 0.5 * 4.0 = 2.0 points
        var studentAnswersA = new List<StudentAnswerItemDto>
        {
            new() { QuestionId = qId, SelectedOptionIds = new List<Guid> { opt1 } }
        };
        var (scoreA, _, detailsA) = GradingEngine.GradeExam(examQuestions, bankQuestions, studentAnswersA);
        Assert.Equal(2.0, scoreA);
        Assert.False(detailsA[0].IsCorrect); // Not fully correct

        // Case B: Student selects all correct answers
        var studentAnswersB = new List<StudentAnswerItemDto>
        {
            new() { QuestionId = qId, SelectedOptionIds = new List<Guid> { opt1, opt2 } }
        };
        var (scoreB, _, detailsB) = GradingEngine.GradeExam(examQuestions, bankQuestions, studentAnswersB);
        Assert.Equal(4.0, scoreB);
        Assert.True(detailsB[0].IsCorrect);

        // Case C: Student selects 1 correct and 1 incorrect answer
        // Fraction = (1/2) - (1/2) = 0
        var studentAnswersC = new List<StudentAnswerItemDto>
        {
            new() { QuestionId = qId, SelectedOptionIds = new List<Guid> { opt1, opt3 } }
        };
        var (scoreC, _, _) = GradingEngine.GradeExam(examQuestions, bankQuestions, studentAnswersC);
        Assert.Equal(0.0, scoreC);
    }

    [Fact]
    public void GradeExam_FillInTheBlank_MatchingAnswers_ShouldAwardPoints()
    {
        var qId = Guid.NewGuid();

        var examQuestions = new List<ExamQuestion>
        {
            new() { QuestionId = qId, Points = 3.0, Type = QuestionType.FillInTheBlank, OrderIndex = 1 }
        };

        var bankQuestions = new List<QuestionDto>
        {
            new()
            {
                Id = qId,
                Type = QuestionType.FillInTheBlank,
                AcceptedAnswers = new List<string> { "Đà Nẵng", "Da Nang" }
            }
        };

        var studentAnswers = new List<StudentAnswerItemDto>
        {
            new() { QuestionId = qId, TextAnswer = "  da nang. " }
        };

        var (totalScore, maxScore, details) = GradingEngine.GradeExam(examQuestions, bankQuestions, studentAnswers);

        Assert.Equal(3.0, totalScore);
        Assert.Equal(3.0, maxScore);
        Assert.True(details[0].IsCorrect);
        Assert.Equal(3.0, details[0].PointsAwarded);
    }
}
