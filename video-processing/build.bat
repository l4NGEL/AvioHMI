@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64
cd /d "%~dp0"

set COMMON_SRC=PgmImage.cpp RgbImage.cpp SobelProcessor.cu HudCompositor.cpp BmpWriter.cpp HudPipeline.cpp

rem Standalone CLI (invoked as a subprocess by Core when the JNI lib isn't built).
nvcc edge_detect.cu %COMMON_SRC% -o edge_detect.exe

rem JNI shared library so Core can call the same pipeline in-process instead
rem of spawning edge_detect.exe - see core/src/main/java/avio/service/NativeHudRenderer.java.
rem Requires a JDK (for jni.h); skipped with a message if JAVA_HOME isn't set.
if "%JAVA_HOME%"=="" goto skip_jni
nvcc -shared HudNativeBridge.cpp %COMMON_SRC% -o hud_native.dll -I"%JAVA_HOME%\include" -I"%JAVA_HOME%\include\win32"
goto done

:skip_jni
echo JAVA_HOME not set - skipping hud_native.dll (edge_detect.exe still built)

:done
