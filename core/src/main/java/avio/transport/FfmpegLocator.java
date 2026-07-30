package avio.transport;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * Finds an ffmpeg executable to decode frames for the CUDA HUD pipeline.
 * Tries PATH first; if a session's PATH hasn't picked up a package manager
 * install yet, falls back to scanning the common WinGet install location so
 * the app works right after `winget install ffmpeg` without a shell restart.
 */
public final class FfmpegLocator {

    private FfmpegLocator() {
    }

    public static String resolve() {
        if (isRunnable("ffmpeg")) {
            return "ffmpeg";
        }
        return findInWinget().orElse(null);
    }

    private static boolean isRunnable(String command) {
        try {
            Process process = new ProcessBuilder(command, "-version")
                    .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                    .redirectError(ProcessBuilder.Redirect.DISCARD)
                    .start();
            return process.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private static Optional<String> findInWinget() {
        String localAppData = System.getenv("LOCALAPPDATA");
        if (localAppData == null) return Optional.empty();

        File packagesDir = new File(localAppData, "Microsoft/WinGet/Packages");
        File[] ffmpegDirs = packagesDir.listFiles((dir, name) -> name.startsWith("Gyan.FFmpeg"));
        if (ffmpegDirs == null) return Optional.empty();

        for (File dir : ffmpegDirs) {
            try (Stream<Path> paths = Files.walk(dir.toPath(), 4)) {
                Optional<Path> exe = paths
                        .filter(p -> p.getFileName().toString().equalsIgnoreCase("ffmpeg.exe"))
                        .max(Comparator.comparing(Path::toString));
                if (exe.isPresent()) return Optional.of(exe.get().toAbsolutePath().toString());
            } catch (IOException ignored) {
                // keep looking at other candidate directories
            }
        }
        return Optional.empty();
    }
}
