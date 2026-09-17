using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.All
});

app.UseCors("AllowFrontend");

app.MapGet("/", () => Results.Ok(new
{
    Service = "Exam249 API Gateway (YARP)",
    Status = "Healthy",
    TimestampUtc = DateTime.UtcNow,
    Endpoints = new[]
    {
        "/api/auth",
        "/api/users",
        "/api/classrooms",
        "/api/subjects",
        "/api/questions",
        "/api/exams",
        "/api/anticheat",
        "/api/reporting"
    }
}));

app.MapReverseProxy();

app.Run();
