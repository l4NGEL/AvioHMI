FROM eclipse-temurin:17-jdk AS build
WORKDIR /build
COPY src src
RUN find src/main/java -name "*.java" > sources.txt \
    && javac -d out @sources.txt \
    && rm sources.txt

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/out out
COPY lib lib
EXPOSE 8765 8766
ENTRYPOINT ["java", "-cp", "out:lib/postgresql.jar", "avio.app.TelemetryServerApp"]
