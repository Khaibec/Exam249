FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["src/Services/ApiGateway/Exam249.ApiGateway/Exam249.ApiGateway.csproj", "src/Services/ApiGateway/Exam249.ApiGateway/"]
RUN dotnet restore "src/Services/ApiGateway/Exam249.ApiGateway/Exam249.ApiGateway.csproj"

COPY . .
WORKDIR "/src/src/Services/ApiGateway/Exam249.ApiGateway"
RUN dotnet build "Exam249.ApiGateway.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Exam249.ApiGateway.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Exam249.ApiGateway.dll"]
