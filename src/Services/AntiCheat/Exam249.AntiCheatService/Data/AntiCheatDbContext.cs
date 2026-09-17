using Exam249.AntiCheatService.Entities;
using Microsoft.EntityFrameworkCore;

namespace Exam249.AntiCheatService.Data;

public class AntiCheatDbContext : DbContext
{
    public AntiCheatDbContext(DbContextOptions<AntiCheatDbContext> options) : base(options)
    {
    }

    public DbSet<ExamViolation> ExamViolations => Set<ExamViolation>();
    public DbSet<RiskAssessment> RiskAssessments => Set<RiskAssessment>();
    public DbSet<ProctoringSnapshot> ProctoringSnapshots => Set<ProctoringSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ExamViolation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SessionId);
            entity.Property(e => e.Type).HasConversion<int>();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Metadata).HasMaxLength(1000);
        });

        modelBuilder.Entity<RiskAssessment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SessionId).IsUnique();
            entity.Property(e => e.RiskLevel).HasConversion<int>();
        });

        modelBuilder.Entity<ProctoringSnapshot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SessionId);
            entity.Property(e => e.TriggerReason).HasMaxLength(100);
        });
    }
}
