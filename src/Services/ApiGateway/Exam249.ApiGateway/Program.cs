using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // AllowCredentials required for SignalR WebSocket/Negotiate through Gateway
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.All
});

app.UseCors("AllowFrontend");

// Security Middleware: Block external access to internal service endpoints & strip internal headers
app.Use(async (context, next) =>
{
    var pathValue = context.Request.Path.Value ?? string.Empty;

    // Prevent external clients from accessing internal endpoints
    if (context.Request.Path.StartsWithSegments("/api/questions/batch-get", StringComparison.OrdinalIgnoreCase) ||
        pathValue.Contains("/internal/", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync("{\"success\":false,\"message\":\"Truy cập endpoint nội bộ bị từ chối.\"}");
        return;
    }

    // Strip incoming internal security headers to prevent client-side spoofing
    context.Request.Headers.Remove("X-Internal-Secret");

    await next();
});

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
        "/api/reporting",
        "/hubs/anticheat"
    }
}));

app.MapReverseProxy();

app.Run();
