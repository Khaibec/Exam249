using Exam249.Shared.Common.Entities;

namespace Exam249.ClassroomService.Entities;

public class Subject : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public ICollection<Classroom> Classrooms { get; set; } = new List<Classroom>();
}

public class Classroom : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty; // Mã tham gia lớp (VD: LOP12A1)
    public string Description { get; set; } = string.Empty;
    public Guid TeacherId { get; set; }
    public string TeacherName { get; set; } = string.Empty;

    public Guid SubjectId { get; set; }
    public Subject Subject { get; set; } = null!;

    public ICollection<ClassroomStudent> Students { get; set; } = new List<ClassroomStudent>();
}

public class ClassroomStudent : BaseEntity
{
    public Guid ClassroomId { get; set; }
    public Classroom Classroom { get; set; } = null!;

    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;
}
