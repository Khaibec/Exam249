using Exam249.QuestionBankService.Data;
using Exam249.QuestionBankService.Entities;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Exam249.QuestionBankService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuestionsController : ControllerBase
{
    private readonly QuestionBankDbContext _context;

    public QuestionsController(QuestionBankDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<PagedResult<QuestionDto>>>> GetQuestions([FromQuery] QuestionFilterRequest filter)
    {
        var query = _context.Questions
            .Include(q => q.Options)
            .Include(q => q.AcceptedAnswers)
            .Where(q => !q.IsDeleted);

        if (filter.SubjectId.HasValue)
            query = query.Where(q => q.SubjectId == filter.SubjectId.Value);

        if (filter.Type.HasValue)
            query = query.Where(q => q.Type == filter.Type.Value);

        if (filter.Difficulty.HasValue)
            query = query.Where(q => q.Difficulty == filter.Difficulty.Value);

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var k = filter.Keyword.Trim().ToLower();
            query = query.Where(q => q.Content.ToLower().Contains(k) || q.Tags.ToLower().Contains(k));
        }

        if (!string.IsNullOrWhiteSpace(filter.Tag))
        {
            var t = filter.Tag.Trim().ToLower();
            query = query.Where(q => q.Tags.ToLower().Contains(t));
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(q => q.CreatedAtUtc)
            .Skip((filter.PageIndex - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(q => new QuestionDto
            {
                Id = q.Id,
                SubjectId = q.SubjectId,
                SubjectName = q.SubjectName,
                Content = q.Content,
                ImageUrl = q.ImageUrl,
                Type = q.Type,
                Difficulty = q.Difficulty,
                DefaultPoints = q.DefaultPoints,
                Explanation = q.Explanation,
                Tags = q.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
                Options = q.Options.OrderBy(o => o.OrderIndex).Select(o => new QuestionOptionDto
                {
                    Id = o.Id,
                    Content = o.Content,
                    IsCorrect = o.IsCorrect,
                    OrderIndex = o.OrderIndex
                }).ToList(),
                AcceptedAnswers = q.AcceptedAnswers.Select(a => a.AnswerText).ToList(),
                CreatedAtUtc = q.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(ApiResponse<PagedResult<QuestionDto>>.Ok(new PagedResult<QuestionDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        }));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<QuestionDto>>> GetQuestionById(Guid id)
    {
        var q = await _context.Questions
            .Include(x => x.Options)
            .Include(x => x.AcceptedAnswers)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (q == null)
            return NotFound(ApiResponse<QuestionDto>.Fail("Không tìm thấy câu hỏi."));

        return Ok(ApiResponse<QuestionDto>.Ok(new QuestionDto
        {
            Id = q.Id,
            SubjectId = q.SubjectId,
            SubjectName = q.SubjectName,
            Content = q.Content,
            ImageUrl = q.ImageUrl,
            Type = q.Type,
            Difficulty = q.Difficulty,
            DefaultPoints = q.DefaultPoints,
            Explanation = q.Explanation,
            Tags = q.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
            Options = q.Options.OrderBy(o => o.OrderIndex).Select(o => new QuestionOptionDto
            {
                Id = o.Id,
                Content = o.Content,
                IsCorrect = o.IsCorrect,
                OrderIndex = o.OrderIndex
            }).ToList(),
            AcceptedAnswers = q.AcceptedAnswers.Select(a => a.AnswerText).ToList(),
            CreatedAtUtc = q.CreatedAtUtc
        }));
    }

    [HttpPost]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<QuestionDto>>> CreateQuestion([FromBody] CreateQuestionRequest request)
    {
        var question = new Question
        {
            SubjectId = request.SubjectId,
            SubjectName = "Môn học",
            Content = request.Content.Trim(),
            ImageUrl = request.ImageUrl,
            Type = request.Type,
            Difficulty = request.Difficulty,
            DefaultPoints = request.DefaultPoints > 0 ? request.DefaultPoints : 1.0,
            Explanation = request.Explanation?.Trim(),
            Tags = string.Join(",", request.Tags ?? new List<string>()),
            CreatedAtUtc = DateTime.UtcNow
        };

        if (request.Type == QuestionType.FillInTheBlank)
        {
            foreach (var answer in request.AcceptedAnswers)
            {
                if (!string.IsNullOrWhiteSpace(answer))
                {
                    question.AcceptedAnswers.Add(new QuestionAcceptedAnswer
                    {
                        AnswerText = answer.Trim()
                    });
                }
            }
        }
        else
        {
            int index = 1;
            foreach (var opt in request.Options)
            {
                question.Options.Add(new QuestionOption
                {
                    Content = opt.Content.Trim(),
                    IsCorrect = opt.IsCorrect,
                    OrderIndex = opt.OrderIndex > 0 ? opt.OrderIndex : index++
                });
            }
        }

        await _context.Questions.AddAsync(question);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<QuestionDto>.Ok(new QuestionDto
        {
            Id = question.Id,
            SubjectId = question.SubjectId,
            SubjectName = question.SubjectName,
            Content = question.Content,
            ImageUrl = question.ImageUrl,
            Type = question.Type,
            Difficulty = question.Difficulty,
            DefaultPoints = question.DefaultPoints,
            Explanation = question.Explanation,
            Tags = request.Tags ?? new List<string>(),
            CreatedAtUtc = question.CreatedAtUtc
        }, "Tạo câu hỏi thành công!"));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse>> UpdateQuestion(Guid id, [FromBody] UpdateQuestionRequest request)
    {
        var question = await _context.Questions
            .Include(q => q.Options)
            .Include(q => q.AcceptedAnswers)
            .FirstOrDefaultAsync(q => q.Id == id && !q.IsDeleted);

        if (question == null)
            return NotFound(ApiResponse.Fail("Không tìm thấy câu hỏi."));

        question.SubjectId = request.SubjectId;
        question.Content = request.Content.Trim();
        question.ImageUrl = request.ImageUrl;
        question.Type = request.Type;
        question.Difficulty = request.Difficulty;
        question.DefaultPoints = request.DefaultPoints;
        question.Explanation = request.Explanation?.Trim();
        question.Tags = string.Join(",", request.Tags ?? new List<string>());
        question.UpdatedAtUtc = DateTime.UtcNow;

        _context.QuestionOptions.RemoveRange(question.Options);
        _context.QuestionAcceptedAnswers.RemoveRange(question.AcceptedAnswers);

        if (request.Type == QuestionType.FillInTheBlank)
        {
            foreach (var answer in request.AcceptedAnswers)
            {
                if (!string.IsNullOrWhiteSpace(answer))
                {
                    question.AcceptedAnswers.Add(new QuestionAcceptedAnswer
                    {
                        QuestionId = question.Id,
                        AnswerText = answer.Trim()
                    });
                }
            }
        }
        else
        {
            int index = 1;
            foreach (var opt in request.Options)
            {
                question.Options.Add(new QuestionOption
                {
                    QuestionId = question.Id,
                    Content = opt.Content.Trim(),
                    IsCorrect = opt.IsCorrect,
                    OrderIndex = opt.OrderIndex > 0 ? opt.OrderIndex : index++
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Cập nhật câu hỏi thành công."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse>> DeleteQuestion(Guid id)
    {
        var question = await _context.Questions.FindAsync(id);
        if (question == null)
            return NotFound(ApiResponse.Fail("Không tìm thấy câu hỏi."));

        question.IsDeleted = true;
        question.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Xóa câu hỏi thành công."));
    }

    /// <summary>
    /// Endpoint nội bộ cho ExamService lấy chi tiết danh sách câu hỏi kèm đáp án để chấm điểm
    /// </summary>
    [HttpPost("batch-get")]
    [AllowAnonymous] // Inter-service communication via API Gateway or direct internal network
    public async Task<ActionResult<ApiResponse<List<QuestionDto>>>> BatchGetQuestions([FromBody] List<Guid> questionIds)
    {
        var questions = await _context.Questions
            .Include(q => q.Options)
            .Include(q => q.AcceptedAnswers)
            .Where(q => questionIds.Contains(q.Id) && !q.IsDeleted)
            .Select(q => new QuestionDto
            {
                Id = q.Id,
                SubjectId = q.SubjectId,
                SubjectName = q.SubjectName,
                Content = q.Content,
                ImageUrl = q.ImageUrl,
                Type = q.Type,
                Difficulty = q.Difficulty,
                DefaultPoints = q.DefaultPoints,
                Explanation = q.Explanation,
                Tags = q.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
                Options = q.Options.OrderBy(o => o.OrderIndex).Select(o => new QuestionOptionDto
                {
                    Id = o.Id,
                    Content = o.Content,
                    IsCorrect = o.IsCorrect,
                    OrderIndex = o.OrderIndex
                }).ToList(),
                AcceptedAnswers = q.AcceptedAnswers.Select(a => a.AnswerText).ToList(),
                CreatedAtUtc = q.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(ApiResponse<List<QuestionDto>>.Ok(questions));
    }
}
