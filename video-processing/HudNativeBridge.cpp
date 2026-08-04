// see NativeHudRenderer.java for the Java side
#include <jni.h>
#include "HudPipeline.h"

extern "C" JNIEXPORT jboolean JNICALL
Java_avio_service_NativeHudRenderer_render(JNIEnv* env, jclass, jdouble headingDeg, jdouble speedKts,
                                            jdouble altitudeMeters, jstring outPath, jstring inputPgmPath) {
    const char* outPathChars = env->GetStringUTFChars(outPath, nullptr);
    const char* inputPathChars = inputPgmPath ? env->GetStringUTFChars(inputPgmPath, nullptr) : nullptr;

    bool ok = true;
    try {
        HudPipeline::run(headingDeg, speedKts, altitudeMeters, outPathChars, inputPathChars);
    } catch (...) {
        ok = false;
    }

    env->ReleaseStringUTFChars(outPath, outPathChars);
    if (inputPathChars) env->ReleaseStringUTFChars(inputPgmPath, inputPathChars);
    return ok ? JNI_TRUE : JNI_FALSE;
}
