using Exam249.ClassroomService.Data;
using Exam249.ClassroomService.Entities;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Exam249.ClassroomService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubjectsController : ControllerBase
{
    private readonly ClassroomDbContext _context;

    public SubjectsController(ClassroomDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<List<SubjectDto>>>> GetAllSubjects()
    {
        var subjects = await _context.Subjects
            .Where(s => !s.IsDeleted)
            .OrderBy(s => s.Name)
            .Select(s => new SubjectDto
            {
                Id = s.Id,
                Code = s.Code,
                Name = s.Name,
                Description = s.Description
            })
            .ToListAsync();

        return Ok(ApiResponse<List<SubjectDto>>.Ok(subjects));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SubjectDto>>> GetSubjectById(Guid id)
    {
        var s = await _context.Subjects.FindAsync(id);
        if (s == null || s.IsDeleted)
            return NotFound(ApiResponse<SubjectDto>.Fail("Không tìm thấy môn học."));

        return Ok(ApiResponse<SubjectDto>.Ok(new SubjectDto
        {
            Id = s.Id,
            Code = s.Code,
            Name = s.Name,
            Description = s.Description
        }));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<ActionResult<ApiResponse<SubjectDto>>> CreateSubject([FromBody] CreateSubjectRequest request)
    {
        var exists = await _context.Subjects.AnyAsync(s => s.Code.ToUpper() == request.Code.Trim().ToUpper() && !s.IsDeleted);
        if (exists)
            return BadRequest(ApiResponse<SubjectDto>.Fail("Mã môn học đã tồn tại."));

        var subject = new Subject
        {
            Code = request.Code.Trim().ToUpper(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            CreatedAtUtc = DateTime.UtcNow
        };

        await _context.Subjects.AddAsync(subject);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<SubjectDto>.Ok(new SubjectDto
        {
            Id = subject.Id,
            Code = subject.Code,
            Name = subject.Name,
            Description = subject.Description
        }, "Tạo môn học thành công!"));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse>> UpdateSubject(Guid id, [FromBody] CreateSubjectRequest request)
    {
        var subject = await _context.Subjects.FindAsync(id);
        if (subject == null || subject.IsDeleted)
            return NotFound(ApiResponse.Fail("Không tìm thấy môn học."));

        subject.Name = request.Name.Trim();
        subject.Description = request.Description?.Trim() ?? string.Empty;
        subject.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Cập nhật môn học thành công."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse>> DeleteSubject(Guid id)
    {
        var subject = await _context.Subjects.FindAsync(id);
        if (subject == null)
            return NotFound(ApiResponse.Fail("Không tìm thấy môn học."));

        subject.IsDeleted = true;
        subject.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Xóa môn học thành công."));
    }
}
