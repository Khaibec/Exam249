using System.Security.Claims;
using Exam249.ClassroomService.Data;
using Exam249.ClassroomService.Entities;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Exam249.Shared.Common.Security;
using Microsoft.Extensions.Configuration;

namespace Exam249.ClassroomService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClassroomsController : ControllerBase
{
    private readonly ClassroomDbContext _context;
    private readonly IConfiguration _configuration;

    public ClassroomsController(ClassroomDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ClassroomDto>>>> GetClassrooms()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(userIdStr, out var userId);

        var query = _context.Classrooms
            .Include(c => c.Subject)
            .Include(c => c.Students)
            .Where(c => !c.IsDeleted);

        if (role == "Teacher")
        {
            query = query.Where(c => c.TeacherId == userId);
        }
        else if (role == "Student")
        {
            query = query.Where(c => c.Students.Any(s => s.StudentId == userId));
        }

        var list = await query
            .OrderByDescending(c => c.CreatedAtUtc)
            .Select(c => new ClassroomDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                Description = c.Description,
                TeacherId = c.TeacherId,
                TeacherName = c.TeacherName,
                SubjectId = c.SubjectId,
                SubjectName = c.Subject.Name,
                StudentCount = c.Students.Count,
                CreatedAtUtc = c.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(ApiResponse<List<ClassroomDto>>.Ok(list));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ClassroomDto>>> GetClassroomById(Guid id)
    {
        var c = await _context.Classrooms
            .Include(x => x.Subject)
            .Include(x => x.Students)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (c == null)
            return NotFound(ApiResponse<ClassroomDto>.Fail("Không tìm thấy lớp học."));

        var dto = new ClassroomDto
        {
            Id = c.Id,
            Name = c.Name,
            Code = c.Code,
            Description = c.Description,
            TeacherId = c.TeacherId,
            TeacherName = c.TeacherName,
            SubjectId = c.SubjectId,
            SubjectName = c.Subject.Name,
            StudentCount = c.Students.Count,
            CreatedAtUtc = c.CreatedAtUtc
        };

        return Ok(ApiResponse<ClassroomDto>.Ok(dto));
    }

    [HttpGet("{id:guid}/students")]
    public async Task<ActionResult<ApiResponse<List<ClassroomStudentDto>>>> GetClassroomStudents(Guid id)
    {
        var students = await _context.ClassroomStudents
            .Where(cs => cs.ClassroomId == id)
            .OrderBy(cs => cs.StudentName)
            .Select(cs => new ClassroomStudentDto
            {
                StudentId = cs.StudentId,
                StudentName = cs.StudentName,
                StudentEmail = cs.StudentEmail,
                JoinedAtUtc = cs.JoinedAtUtc
            })
            .ToListAsync();

        return Ok(ApiResponse<List<ClassroomStudentDto>>.Ok(students));
    }

    [HttpPost]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse<ClassroomDto>>> CreateClassroom([FromBody] CreateClassroomRequest request)
    {
        var teacherIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var teacherName = User.FindFirstValue(ClaimTypes.Name) ?? "Giáo viên";
        Guid.TryParse(teacherIdStr, out var teacherId);

        var subject = await _context.Subjects.FindAsync(request.SubjectId);
        if (subject == null)
            return BadRequest(ApiResponse<ClassroomDto>.Fail("Môn học không tồn tại."));

        // Generate unique 6-8 char code
        var code = "CLS" + Guid.NewGuid().ToString("N")[..5].ToUpper();

        var classroom = new Classroom
        {
            Name = request.Name.Trim(),
            Code = code,
            Description = request.Description?.Trim() ?? string.Empty,
            TeacherId = teacherId,
            TeacherName = teacherName,
            SubjectId = request.SubjectId,
            CreatedAtUtc = DateTime.UtcNow
        };

        await _context.Classrooms.AddAsync(classroom);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<ClassroomDto>.Ok(new ClassroomDto
        {
            Id = classroom.Id,
            Name = classroom.Name,
            Code = classroom.Code,
            Description = classroom.Description,
            TeacherId = classroom.TeacherId,
            TeacherName = classroom.TeacherName,
            SubjectId = classroom.SubjectId,
            SubjectName = subject.Name,
            StudentCount = 0,
            CreatedAtUtc = classroom.CreatedAtUtc
        }, "Tạo lớp học thành công!"));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse>> UpdateClassroom(Guid id, [FromBody] UpdateClassroomRequest request)
    {
        var classroom = await _context.Classrooms.FindAsync(id);
        if (classroom == null || classroom.IsDeleted)
            return NotFound(ApiResponse.Fail("Không tìm thấy lớp học."));

        classroom.Name = request.Name.Trim();
        classroom.Description = request.Description?.Trim() ?? string.Empty;
        classroom.SubjectId = request.SubjectId;
        classroom.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ApiResponse.Ok("Cập nhật lớp học thành công."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse>> DeleteClassroom(Guid id)
    {
        var classroom = await _context.Classrooms.FindAsync(id);
        if (classroom == null)
            return NotFound(ApiResponse.Fail("Không tìm thấy lớp học."));

        classroom.IsDeleted = true;
        classroom.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Xóa lớp học thành công."));
    }

    [HttpPost("join")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ApiResponse>> JoinClassroom([FromBody] JoinClassroomRequest request)
    {
        var studentIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var studentName = User.FindFirstValue(ClaimTypes.Name) ?? "Học sinh";
        var studentEmail = User.FindFirstValue(ClaimTypes.Email) ?? "";
        Guid.TryParse(studentIdStr, out var studentId);

        var classroom = await _context.Classrooms
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Code.ToUpper() == request.Code.Trim().ToUpper() && !c.IsDeleted);

        if (classroom == null)
            return NotFound(ApiResponse.Fail("Mã lớp học không tồn tại. Vui lòng kiểm tra lại."));

        if (classroom.Students.Any(s => s.StudentId == studentId))
            return BadRequest(ApiResponse.Fail("Bạn đã tham gia lớp học này rồi."));

        classroom.Students.Add(new ClassroomStudent
        {
            ClassroomId = classroom.Id,
            StudentId = studentId,
            StudentName = studentName,
            StudentEmail = studentEmail,
            JoinedAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Ok(ApiResponse.Ok($"Tham gia lớp học '{classroom.Name}' thành công!"));
    }

    [HttpDelete("{id:guid}/students/{studentId:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<ApiResponse>> RemoveStudent(Guid id, Guid studentId)
    {
        var record = await _context.ClassroomStudents
            .FirstOrDefaultAsync(cs => cs.ClassroomId == id && cs.StudentId == studentId);

        if (record == null)
            return NotFound(ApiResponse.Fail("Không tìm thấy học sinh trong lớp học."));

        _context.ClassroomStudents.Remove(record);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Đã xóa học sinh khỏi lớp học."));
    }

    [HttpGet("my-enrolled-ids")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<List<Guid>>>> GetEnrolledClassroomIds([FromQuery] Guid? studentId = null)
    {
        var isInternal = InternalSecurityConstants.IsValidInternalRequest(Request, _configuration);
        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(currentUserIdStr, out var currentUserId);

        var targetStudentId = (isInternal && studentId.HasValue) ? studentId.Value : currentUserId;

        if (targetStudentId == Guid.Empty)
        {
            return Unauthorized(ApiResponse<List<Guid>>.Fail("Không thể xác định học sinh."));
        }

        var classIds = await _context.ClassroomStudents
            .Where(cs => cs.StudentId == targetStudentId)
            .Select(cs => cs.ClassroomId)
            .ToListAsync();

        return Ok(ApiResponse<List<Guid>>.Ok(classIds));
    }

    [HttpGet("{id:guid}/is-enrolled")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<bool>>> CheckStudentEnrolled(Guid id, [FromQuery] Guid studentId)
    {
        var isInternal = InternalSecurityConstants.IsValidInternalRequest(Request, _configuration);
        var isPrivileged = User.IsInRole("Teacher") || User.IsInRole("Admin");
        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(currentUserIdStr, out var currentUserId);

        if (!isInternal && !isPrivileged && currentUserId != studentId)
        {
            return Forbid();
        }

        var isEnrolled = await _context.ClassroomStudents
            .AnyAsync(cs => cs.ClassroomId == id && cs.StudentId == studentId);

        return Ok(ApiResponse<bool>.Ok(isEnrolled));
    }
}
