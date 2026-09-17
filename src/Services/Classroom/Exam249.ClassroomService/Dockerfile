FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["src/BuildingBlocks/Exam249.Shared.Contracts/Exam249.Shared.Contracts.csproj", "src/BuildingBlocks/Exam249.Shared.Contracts/"]
COPY ["src/BuildingBlocks/Exam249.Shared.Common/Exam249.Shared.Common.csproj", "src/BuildingBlocks/Exam249.Shared.Common/"]
COPY ["src/BuildingBlocks/Exam249.Shared.EventBus/Exam249.Shared.EventBus.csproj", "src/BuildingBlocks/Exam249.Shared.EventBus/"]
COPY ["src/Services/Classroom/Exam249.ClassroomService/Exam249.ClassroomService.csproj", "src/Services/Classroom/Exam249.ClassroomService/"]

RUN dotnet restore "src/Services/Classroom/Exam249.ClassroomService/Exam249.ClassroomService.csproj"

COPY . .
WORKDIR "/src/src/Services/Classroom/Exam249.ClassroomService"
RUN dotnet build "Exam249.ClassroomService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Exam249.ClassroomService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Exam249.ClassroomService.dll"]
