using Exam249.IdentityService.Data;
using Exam249.IdentityService.Entities;
using Exam249.Shared.Common.Security;
using Exam249.Shared.Contracts.Common;
using Exam249.Shared.Contracts.DTOs;
using Exam249.Shared.Contracts.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Exam249.IdentityService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IdentityDbContext _context;
    private readonly JwtTokenService _tokenService;
    private readonly JwtOptions _jwtOptions;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IdentityDbContext context,
        JwtTokenService tokenService,
        JwtOptions jwtOptions,
        ILogger<AuthController> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower() && !u.IsDeleted);

        if (user == null || !PasswordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized(ApiResponse<AuthResponse>.Fail("Email hoặc mật khẩu không chính xác."));
        }

        if (!user.IsActive)
        {
            return BadRequest(ApiResponse<AuthResponse>.Fail("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên."));
        }

        var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(user.Id, user.Email, user.FullName, user.Role);
        var refreshTokenValue = _tokenService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpiryDays)
        };

        await _context.RefreshTokens.AddAsync(refreshToken);
        await _context.SaveChangesAsync();

        var response = new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshTokenValue,
            ExpiresAtUtc = expiresAt,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAtUtc = user.CreatedAtUtc
            }
        };

        _logger.LogInformation("User logged in successfully: {Email}", user.Email);
        return Ok(ApiResponse<AuthResponse>.Ok(response, "Đăng nhập thành công!"));
    }

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register([FromBody] RegisterRequest request)
    {
        var existingUser = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == request.Email.ToLower() && !u.IsDeleted);

        if (existingUser)
        {
            return BadRequest(ApiResponse<AuthResponse>.Fail("Email này đã được sử dụng bởi một tài khoản khác."));
        }

        var user = new ApplicationUser
        {
            Email = request.Email.Trim().ToLower(),
            PasswordHash = PasswordHasher.HashPassword(request.Password),
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim() ?? string.Empty,
            // Security Fix (CRIT-01): Public registration must strictly assign Student role
            Role = UserRole.Student,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(user.Id, user.Email, user.FullName, user.Role);
        var refreshTokenValue = _tokenService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpiryDays)
        };

        await _context.RefreshTokens.AddAsync(refreshToken);
        await _context.SaveChangesAsync();

        var response = new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshTokenValue,
            ExpiresAtUtc = expiresAt,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAtUtc = user.CreatedAtUtc
            }
        };

        return Ok(ApiResponse<AuthResponse>.Ok(response, "Đăng ký tài khoản thành công!"));
    }

    [HttpPost("refresh-token")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var principal = _tokenService.GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal == null)
        {
            return Unauthorized(ApiResponse<AuthResponse>.Fail("Access token không hợp lệ."));
        }

        var refreshToken = await _context.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == request.RefreshToken);

        if (refreshToken == null || !refreshToken.IsActive || refreshToken.User.IsDeleted || !refreshToken.User.IsActive)
        {
            return Unauthorized(ApiResponse<AuthResponse>.Fail("Refresh token đã hết hạn hoặc không hợp lệ."));
        }

        // Revoke old token
        refreshToken.RevokedAtUtc = DateTime.UtcNow;

        // Issue new tokens
        var user = refreshToken.User;
        var (newAccessToken, expiresAt) = _tokenService.GenerateAccessToken(user.Id, user.Email, user.FullName, user.Role);
        var newRefreshTokenValue = _tokenService.GenerateRefreshToken();

        var newRefreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = newRefreshTokenValue,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpiryDays)
        };

        await _context.RefreshTokens.AddAsync(newRefreshToken);
        await _context.SaveChangesAsync();

        var response = new AuthResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshTokenValue,
            ExpiresAtUtc = expiresAt,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAtUtc = user.CreatedAtUtc
            }
        };

        return Ok(ApiResponse<AuthResponse>.Ok(response, "Làm mới phiên đăng nhập thành công."));
    }

    [HttpPost("revoke-token")]
    public async Task<ActionResult<ApiResponse>> RevokeToken([FromBody] RefreshTokenRequest request)
    {
        var refreshToken = await _context.RefreshTokens.FirstOrDefaultAsync(r => r.Token == request.RefreshToken);
        if (refreshToken != null && !refreshToken.IsRevoked)
        {
            refreshToken.RevokedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return Ok(ApiResponse.Ok("Hủy token thành công."));
    }
}
