using System.Text.Json;
using Exam249.ExamService.Entities;
using Exam249.Shared.Common.Utilities;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;

namespace Exam249.ExamService.Services;

public static class GradingEngine
{
    public class QuestionGradingResult
    {
        public Guid QuestionId { get; set; }
        public string Content { get; set; } = string.Empty;
        public QuestionType Type { get; set; }
        public double PointsAwarded { get; set; }
        public double MaxPoints { get; set; }
        public bool IsCorrect { get; set; }
        public List<Guid> SelectedOptionIds { get; set; } = new();
        public string? TextAnswer { get; set; }
        public List<Guid> CorrectOptionIds { get; set; } = new();
        public List<string> AcceptedAnswers { get; set; } = new();
        public string? Explanation { get; set; }
    }

    public static (double TotalScore, double MaxScore, List<QuestionGradingResult> Details) GradeExam(
        List<ExamQuestion> examQuestions,
        List<QuestionDto> bankQuestions,
        List<StudentAnswerItemDto> studentAnswers)
    {
        var details = new List<QuestionGradingResult>();
        double totalScore = 0.0;
        double maxScore = 0.0;

        var bankLookup = bankQuestions.ToDictionary(q => q.Id);
        var answerLookup = studentAnswers.ToDictionary(a => a.QuestionId);

        foreach (var eq in examQuestions)
        {
            maxScore += eq.Points;

            bankLookup.TryGetValue(eq.QuestionId, out var bankQ);
            answerLookup.TryGetValue(eq.QuestionId, out var answer);

            var result = new QuestionGradingResult
            {
                QuestionId = eq.QuestionId,
                Content = eq.Content,
                Type = eq.Type,
                MaxPoints = eq.Points,
                Explanation = bankQ?.Explanation
            };

            if (bankQ != null)
            {
                result.CorrectOptionIds = bankQ.Options.Where(o => o.IsCorrect).Select(o => o.Id).ToList();
                result.AcceptedAnswers = bankQ.AcceptedAnswers;
            }

            if (answer != null)
            {
                result.SelectedOptionIds = answer.SelectedOptionIds ?? new List<Guid>();
                result.TextAnswer = answer.TextAnswer;
            }

            switch (eq.Type)
            {
                case QuestionType.SingleChoice:
                    if (result.SelectedOptionIds.Count == 1 &&
                        result.CorrectOptionIds.Count == 1 &&
                        result.SelectedOptionIds[0] == result.CorrectOptionIds[0])
                    {
                        result.IsCorrect = true;
                        result.PointsAwarded = eq.Points;
                    }
                    else
                    {
                        result.IsCorrect = false;
                        result.PointsAwarded = 0;
                    }
                    break;

                case QuestionType.MultipleChoice:
                    var studentSet = new HashSet<Guid>(result.SelectedOptionIds);
                    var correctSet = new HashSet<Guid>(result.CorrectOptionIds);

                    if (studentSet.SetEquals(correctSet))
                    {
                        result.IsCorrect = true;
                        result.PointsAwarded = eq.Points;
                    }
                    else
                    {
                        // Partial credit: fraction correct minus fraction incorrect penalty, minimum 0
                        int totalCorrectOptions = correctSet.Count;
                        if (totalCorrectOptions > 0)
                        {
                            int correctSelected = studentSet.Count(id => correctSet.Contains(id));
                            int incorrectSelected = studentSet.Count(id => !correctSet.Contains(id));

                            double fraction = ((double)correctSelected / totalCorrectOptions) - ((double)incorrectSelected / totalCorrectOptions);
                            fraction = Math.Max(0, Math.Min(1, fraction));
                            result.PointsAwarded = Math.Round(fraction * eq.Points, 2);
                            result.IsCorrect = fraction >= 0.99;
                        }
                        else
                        {
                            result.PointsAwarded = 0;
                            result.IsCorrect = false;
                        }
                    }
                    break;

                case QuestionType.FillInTheBlank:
                    bool isMatch = VietnameseTextNormalizer.IsMatch(result.TextAnswer, result.AcceptedAnswers, allowIgnoreDiacritics: true);
                    if (isMatch)
                    {
                        result.IsCorrect = true;
                        result.PointsAwarded = eq.Points;
                    }
                    else
                    {
                        result.IsCorrect = false;
                        result.PointsAwarded = 0;
                    }
                    break;
            }

            totalScore += result.PointsAwarded;
            details.Add(result);
        }

        totalScore = Math.Round(totalScore, 2);
        maxScore = Math.Round(maxScore, 2);

        return (totalScore, maxScore, details);
    }
}
