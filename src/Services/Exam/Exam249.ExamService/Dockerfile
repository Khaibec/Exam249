FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["src/BuildingBlocks/Exam249.Shared.Contracts/Exam249.Shared.Contracts.csproj", "src/BuildingBlocks/Exam249.Shared.Contracts/"]
COPY ["src/BuildingBlocks/Exam249.Shared.Common/Exam249.Shared.Common.csproj", "src/BuildingBlocks/Exam249.Shared.Common/"]
COPY ["src/BuildingBlocks/Exam249.Shared.EventBus/Exam249.Shared.EventBus.csproj", "src/BuildingBlocks/Exam249.Shared.EventBus/"]
COPY ["src/Services/Exam/Exam249.ExamService/Exam249.ExamService.csproj", "src/Services/Exam/Exam249.ExamService/"]

RUN dotnet restore "src/Services/Exam/Exam249.ExamService/Exam249.ExamService.csproj"

COPY . .
WORKDIR "/src/src/Services/Exam/Exam249.ExamService"
RUN dotnet build "Exam249.ExamService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Exam249.ExamService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Exam249.ExamService.dll"]
