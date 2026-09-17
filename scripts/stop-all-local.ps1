# Script to stop all Exam249 local service processes
Write-Host "Dang dung toan bo cac tien trinh cua he thong Exam249..." -ForegroundColor Yellow

$processNames = @("Exam249.IdentityService", "Exam249.ClassroomService", "Exam249.QuestionBankService", "Exam249.ExamService", "Exam249.AntiCheatService", "Exam249.ReportingService", "Exam249.ApiGateway")

foreach ($name in $processNames) {
    Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force
}

Write-Host "Da dung cac microservice backend!" -ForegroundColor Green
