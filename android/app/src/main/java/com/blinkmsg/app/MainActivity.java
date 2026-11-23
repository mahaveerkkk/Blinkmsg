package com.blinkmsg.app;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.database.ContentObserver;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQ_CODE = 101;
    private Activity.ScreenCaptureCallback screenCaptureCallback;
    private ContentObserver screenshotObserver;
    private long lastScreenshotNotificationTime = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Hardware-level privacy protection: Blocks screenshot capture & screen recording (captures black screen)
        getWindow().setFlags(
            android.view.WindowManager.LayoutParams.FLAG_SECURE,
            android.view.WindowManager.LayoutParams.FLAG_SECURE
        );

        // Ensure Android OS runtime permission for Camera and Audio are requested on first launch
        requestRequiredPermissions();

        // Setup real-time silent screenshot detection
        setupScreenshotDetection();
    }

    private void notifyScreenshotToJs() {
        long now = System.currentTimeMillis();
        if (now - lastScreenshotNotificationTime < 2500) {
            return; // Debounce
        }
        lastScreenshotNotificationTime = now;

        runOnUiThread(() -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('nativeScreenshotTaken'));",
                        null
                    );
                }
            } catch (Exception ignored) {}
        });
    }

    private void setupScreenshotDetection() {
        // 1. Android 14+ (API 34, 35, 36) Official OS ScreenCaptureCallback
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            try {
                screenCaptureCallback = new Activity.ScreenCaptureCallback() {
                    @Override
                    public void onScreenCaptured() {
                        notifyScreenshotToJs();
                    }
                };
                registerScreenCaptureCallback(getMainExecutor(), screenCaptureCallback);
            } catch (Exception ignored) {}
        }

        // 2. MediaStore ContentObserver fallback for detecting screenshots
        try {
            Handler handler = new Handler(Looper.getMainLooper());
            screenshotObserver = new ContentObserver(handler) {
                @Override
                public void onChange(boolean selfChange, Uri uri) {
                    super.onChange(selfChange, uri);
                    if (uri != null) {
                        String uriStr = uri.toString().toLowerCase();
                        if (uriStr.contains("screenshot") || uriStr.contains("media")) {
                            notifyScreenshotToJs();
                        }
                    }
                }
            };

            getContentResolver().registerContentObserver(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                true,
                screenshotObserver
            );
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && screenCaptureCallback != null) {
            try {
                unregisterScreenCaptureCallback(screenCaptureCallback);
            } catch (Exception ignored) {}
        }
        if (screenshotObserver != null) {
            try {
                getContentResolver().unregisterContentObserver(screenshotObserver);
            } catch (Exception ignored) {}
        }
    }

    private void requestRequiredPermissions() {
        boolean cameraGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        boolean audioGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;

        if (!cameraGranted || !audioGranted) {
            ActivityCompat.requestPermissions(
                this,
                new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO},
                PERMISSION_REQ_CODE
            );
        }
    }
}
