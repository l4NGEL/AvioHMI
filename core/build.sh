#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

rm -rf out
mkdir -p out

echo "Compiling main sources..."
find src/main/java -name "*.java" > sources.txt
javac -d out @sources.txt
rm sources.txt

echo "Compiling test sources..."
find src/test/java -name "*.java" > test-sources.txt
javac -cp out -d out @test-sources.txt
rm test-sources.txt

echo "Build OK. Run with: ./run.sh"
