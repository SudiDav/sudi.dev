# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source
COPY Directory.Build.props Directory.Packages.props global.json ./
COPY src/ ./src/
RUN dotnet restore src/Web.Api/Web.Api.csproj
RUN dotnet publish src/Web.Api/Web.Api.csproj -c Release --no-restore -o /out /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080
COPY --from=build /out ./
RUN mkdir -p /app/data/media /app/data/keys && chown -R app:app /app/data
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "Web.Api.dll"]
