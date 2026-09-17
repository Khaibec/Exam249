using Exam249.ReportingService.Entities;
using Microsoft.EntityFrameworkCore;

namespace Exam249.ReportingService.Data;

public class ReportingDbContext : DbContext
{
    public ReportingDbContext(DbContextOptions<ReportingDbContext> options) : base(options)
    {
    }

    public DbSet<ExamReportSnapshot> ExamReportSnapshots => Set<ExamReportSnapshot>();
    public DbSet<SystemAuditLog> SystemAuditLogs => Set<SystemAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ExamReportSnapshot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ExamId);
            entity.Property(e => e.ExamTitle).HasMaxLength(250);
            entity.Property(e => e.ClassroomName).HasMaxLength(200);
        });

        modelBuilder.Entity<SystemAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserName).HasMaxLength(200);
            entity.Property(e => e.Action).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Details).HasMaxLength(2000);
        });
    }
}
