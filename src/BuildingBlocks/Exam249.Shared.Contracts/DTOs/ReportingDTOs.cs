namespace Exam249.Shared.Contracts.DTOs;

public class AdminDashboardDto
{
    public int TotalUsers { get; set; }
    public int TotalTeachers { get; set; }
    public int TotalStudents { get; set; }
    public int TotalClassrooms { get; set; }
    public int TotalQuestions { get; set; }
    public int TotalExams { get; set; }
    public int TotalSubmissions { get; set; }
    public double AverageSystemScore { get; set; }
    public List<RecentActivityItemDto> RecentActivities { get; set; } = new();
}

public class TeacherDashboardDto
{
    public int TotalClasses { get; set; }
    public int TotalStudents { get; set; }
    public int TotalExams { get; set; }
    public int TotalSubmissions { get; set; }
    public double OverallPassRate { get; set; }
    public List<ExamSummaryItemDto> RecentExams { get; set; } = new();
}

public class StudentDashboardDto
{
    public int EnrolledClassesCount { get; set; }
    public int PendingExamsCount { get; set; }
    public int CompletedExamsCount { get; set; }
    public double AverageScore { get; set; }
    public List<StudentExamSummaryItemDto> UpcomingExams { get; set; } = new();
    public List<StudentRecentResultItemDto> RecentResults { get; set; } = new();
}

public class RecentActivityItemDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime TimestampUtc { get; set; }
    public string Type { get; set; } = string.Empty;
}

public class ExamSummaryItemDto
{
    public Guid ExamId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ClassroomName { get; set; } = string.Empty;
    public int SubmissionsCount { get; set; }
    public double AverageScore { get; set; }
    public double PassRate { get; set; }
    public int HighRiskCount { get; set; }
    public DateTime EndTimeUtc { get; set; }
}

public class StudentExamSummaryItemDto
{
    public Guid ExamId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ClassroomName { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public DateTime StartTimeUtc { get; set; }
    public DateTime EndTimeUtc { get; set; }
    public bool IsOpen { get; set; }
    public int AttemptsRemaining { get; set; }
}

public class StudentRecentResultItemDto
{
    public Guid SessionId { get; set; }
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public double Score { get; set; }
    public double MaxScore { get; set; }
    public bool IsPassed { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
}

public class ExamAnalyticsDto
{
    public Guid ExamId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ClassroomName { get; set; } = string.Empty;
    public int TotalSubmissions { get; set; }
    public double AverageScore { get; set; }
    public double HighestScore { get; set; }
    public double LowestScore { get; set; }
    public double PassRate { get; set; }
    public int ExcellentCount { get; set; } // >= 8.5
    public int GoodCount { get; set; }      // 7.0 - 8.4
    public int AverageCount { get; set; }   // 5.0 - 6.9
    public int WeakCount { get; set; }      // < 5.0
    public int HighRiskCount { get; set; }
}
