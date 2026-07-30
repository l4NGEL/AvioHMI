// Mirrors .github/workflows/ci.yml and .gitlab-ci.yml — same three build/test
// jobs, expressed as a declarative Jenkins pipeline. Kept in sync by hand
// since the project only actually runs on GitHub; this exists to demonstrate
// the pipeline translates cleanly to whichever CI system a team already has.
// Requires the Docker Pipeline plugin (each stage runs in its own container).

pipeline {
    agent none

    stages {
        stage('Build & test') {
            parallel {
                stage('Core (Java)') {
                    agent { docker { image 'eclipse-temurin:17-jdk' } }
                    steps {
                        dir('core') {
                            sh '''
                                find src/main/java -name "*.java" > sources.txt
                                javac -d out @sources.txt
                                find src/test/java -name "*.java" > test-sources.txt
                                javac -cp out -d out @test-sources.txt
                                java -cp out avio.NavigationServiceTest
                            '''
                        }
                    }
                }

                stage('Ground Control (React + TypeScript)') {
                    agent { docker { image 'node:22' } }
                    steps {
                        dir('ground-control') {
                            sh '''
                                npm ci
                                npx tsc --noEmit
                                npm run build
                            '''
                        }
                    }
                }

                stage('Cockpit MFD (Flutter)') {
                    agent { docker { image 'ghcr.io/cirruslabs/flutter:stable' } }
                    steps {
                        dir('cockpit-mfd') {
                            sh '''
                                flutter pub get
                                flutter analyze
                                flutter test
                            '''
                        }
                    }
                }
            }
        }
    }
}
