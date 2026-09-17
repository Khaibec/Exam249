FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["src/BuildingBlocks/Exam249.Shared.Contracts/Exam249.Shared.Contracts.csproj", "src/BuildingBlocks/Exam249.Shared.Contracts/"]
COPY ["src/BuildingBlocks/Exam249.Shared.Common/Exam249.Shared.Common.csproj", "src/BuildingBlocks/Exam249.Shared.Common/"]
COPY ["src/BuildingBlocks/Exam249.Shared.EventBus/Exam249.Shared.EventBus.csproj", "src/BuildingBlocks/Exam249.Shared.EventBus/"]
COPY ["src/Services/QuestionBank/Exam249.QuestionBankService/Exam249.QuestionBankService.csproj", "src/Services/QuestionBank/Exam249.QuestionBankService/"]

RUN dotnet restore "src/Services/QuestionBank/Exam249.QuestionBankService/Exam249.QuestionBankService.csproj"

COPY . .
WORKDIR "/src/src/Services/QuestionBank/Exam249.QuestionBankService"
RUN dotnet build "Exam249.QuestionBankService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Exam249.QuestionBankService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Exam249.QuestionBankService.dll"]
