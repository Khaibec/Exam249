using Exam249.AntiCheatService.Consumers;
using Exam249.AntiCheatService.Data;
using Exam249.AntiCheatService.Hubs;
using Exam249.AntiCheatService.Services;
using Exam249.Shared.Common.Middleware;
using Exam249.Shared.Common.Security;
using Exam249.Shared.EventBus;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=localhost;Database=Exam249_AntiCheat;Integrated Security=True;TrustServerCertificate=True";

builder.Services.AddDbContext<AntiCheatDbContext>(options =>
{
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
    });
});

builder.Services.AddSharedJwtAuthentication(builder.Configuration);
builder.Services.AddSharedEventBus(builder.Configuration, x =>
{
    x.AddConsumer<ExamSessionStartedConsumer>();
    x.AddConsumer<ExamSubmittedConsumer>();
    x.AddConsumer<SessionDisqualifiedConsumer>();
});

builder.Services.AddSignalR();
builder.Services.AddSingleton<LiveProctoringRegistry>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Exam249 Anti-Cheat & Proctoring Service API",
        Version = "v1",
        Description = "Microservice giám sát gian lận thi cử, tính toán Risk Score và lưu vết vi phạm"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập JWT Bearer token theo định dạng: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        // AllowCredentials required for SignalR WebSocket/Negotiate requests
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AntiCheatDbContext>();
    await context.Database.EnsureCreatedAsync();
    if (context.Database.IsSqlServer())
    {
        await context.Database.ExecuteSqlRawAsync(@"
            IF COL_LENGTH('RiskAssessments', 'ExamId') IS NULL
                ALTER TABLE RiskAssessments ADD ExamId uniqueidentifier NULL;");
    }
}

app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

if (app.Environment.IsDevelopment() || true)
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Exam249 Anti-Cheat Service v1"));
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ProctoringHub>("/hubs/anticheat");

app.Run();
