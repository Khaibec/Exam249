using Exam249.Shared.Common.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Exam249.UnitTests;

public class InternalSecurityTests
{
    [Fact]
    public void IsValidInternalRequest_WithCorrectHeader_ShouldReturnTrue()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["InternalSecurity:SecretKey"] = "Secret_12345"
            })
            .Build();

        var context = new DefaultHttpContext();
        context.Request.Headers[InternalSecurityConstants.HeaderName] = "Secret_12345";

        var result = InternalSecurityConstants.IsValidInternalRequest(context.Request, config);
        Assert.True(result);
    }

    [Fact]
    public void IsValidInternalRequest_WithIncorrectHeader_ShouldReturnFalse()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["InternalSecurity:SecretKey"] = "Secret_12345"
            })
            .Build();

        var context = new DefaultHttpContext();
        context.Request.Headers[InternalSecurityConstants.HeaderName] = "Wrong_Secret";

        var result = InternalSecurityConstants.IsValidInternalRequest(context.Request, config);
        Assert.False(result);
    }

    [Fact]
    public void IsValidInternalRequest_MissingHeader_ShouldReturnFalse()
    {
        var config = new ConfigurationBuilder().Build();
        var context = new DefaultHttpContext();

        var result = InternalSecurityConstants.IsValidInternalRequest(context.Request, config);
        Assert.False(result);
    }

    [Fact]
    public void IsValidInternalRequest_DefaultSecret_ShouldMatchWhenNotConfigured()
    {
        var config = new ConfigurationBuilder().Build(); // No explicit config
        var context = new DefaultHttpContext();
        context.Request.Headers[InternalSecurityConstants.HeaderName] = InternalSecurityConstants.DefaultSecretKey;

        var result = InternalSecurityConstants.IsValidInternalRequest(context.Request, config);
        Assert.True(result);
    }
}
