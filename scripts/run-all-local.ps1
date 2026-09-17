# Script to launch all Exam249 microservices, Gateway, and Angular Frontend locally
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Khoi dong He thong Exam249 (Microservices + Frontend)   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseDir = Split-Path -Parent $PSScriptRoot

$services = @(
    @{ Name = "IdentityService";     Path = "$baseDir\src\Services\Identity\Exam249.IdentityService";     Port = 5001 },
    @{ Name = "ClassroomService";    Path = "$baseDir\src\Services\Classroom\Exam249.ClassroomService";   Port = 5002 },
    @{ Name = "QuestionBankService"; Path = "$baseDir\src\Services\QuestionBank\Exam249.QuestionBankService"; Port = 5003 },
    @{ Name = "ExamService";         Path = "$baseDir\src\Services\Exam\Exam249.ExamService";             Port = 5004 },
    @{ Name = "AntiCheatService";    Path = "$baseDir\src\Services\AntiCheat\Exam249.AntiCheatService";   Port = 5005 },
    @{ Name = "ReportingService";    Path = "$baseDir\src\Services\Reporting\Exam249.ReportingService";   Port = 5006 },
    @{ Name = "ApiGateway";          Path = "$baseDir\src\Services\ApiGateway\Exam249.ApiGateway";         Port = 5000 }
)

foreach ($svc in $services) {
    Write-Host "Dang khoi chay $($svc.Name) tai http://localhost:$($svc.Port)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$($svc.Path)`"; `$env:ASPNETCORE_URLS='http://localhost:$($svc.Port)'; dotnet run"
    Start-Sleep -Seconds 2
}

Write-Host "Dang khoi chay Frontend Angular tai http://localhost:4200..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$baseDir\src\Frontend\exam249-web`"; npm start"

Write-Host ""
Write-Host "Tat ca cac service da duoc khoi dong!" -ForegroundColor Green
Write-Host "Cong API Gateway: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Giao dien Web:     http://localhost:4200" -ForegroundColor Cyan
