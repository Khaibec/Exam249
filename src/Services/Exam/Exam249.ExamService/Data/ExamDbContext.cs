using Exam249.ExamService.Entities;
using Microsoft.EntityFrameworkCore;

namespace Exam249.ExamService.Data;

public class ExamDbContext : DbContext
{
    public ExamDbContext(DbContextOptions<ExamDbContext> options) : base(options)
    {
    }

    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<ExamQuestion> ExamQuestions => Set<ExamQuestion>();
    public DbSet<ExamSession> ExamSessions => Set<ExamSession>();
    public DbSet<ExamSessionAnswer> ExamSessionAnswers => Set<ExamSessionAnswer>();
    public DbSet<ExamSubmission> ExamSubmissions => Set<ExamSubmission>();
    public DbSet<ExamSubmissionDetail> ExamSubmissionDetails => Set<ExamSubmissionDetail>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Exam>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(250).IsRequired();
            entity.Property(e => e.SubjectName).HasMaxLength(200);
            entity.Property(e => e.ClassroomName).HasMaxLength(200);
            entity.Property(e => e.TeacherName).HasMaxLength(200);
            entity.Property(e => e.Status).HasConversion<int>();
        });

        modelBuilder.Entity<ExamQuestion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Type).HasConversion<int>();
            entity.Property(e => e.Difficulty).HasConversion<int>();
            entity.HasOne(e => e.Exam)
                  .WithMany(x => x.Questions)
                  .HasForeignKey(e => e.ExamId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExamSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.StudentName).HasMaxLength(200);
            entity.Property(e => e.StudentEmail).HasMaxLength(200);
            entity.Property(e => e.Status).HasConversion<int>();
            entity.Property(e => e.RiskLevel).HasConversion<int>();
            entity.Property(e => e.ExamVariantCode).HasMaxLength(20);
            entity.HasOne(e => e.Exam)
                  .WithMany(x => x.Sessions)
                  .HasForeignKey(e => e.ExamId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ExamSessionAnswer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ExamSessionId, e.QuestionId }).IsUnique();
            entity.HasOne(e => e.ExamSession)
                  .WithMany(s => s.CurrentAnswers)
                  .HasForeignKey(e => e.ExamSessionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExamSubmission>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.StudentName).HasMaxLength(200);
            entity.Property(e => e.RiskLevel).HasConversion<int>();
            entity.HasOne(e => e.ExamSession)
                  .WithOne(s => s.Submission)
                  .HasForeignKey<ExamSubmission>(e => e.ExamSessionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExamSubmissionDetail>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).HasConversion<int>();
            entity.HasOne(e => e.ExamSubmission)
                  .WithMany(s => s.Details)
                  .HasForeignKey(e => e.ExamSubmissionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
