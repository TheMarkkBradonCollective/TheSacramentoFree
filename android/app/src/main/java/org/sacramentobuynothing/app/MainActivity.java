package org.sacramentobuynothing.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        createNotificationChannel();
        disableWebViewCache();
    }

    @Override
    public void onStart() {
        super.onStart();
        disableWebViewCache();
    }

    private void disableWebViewCache() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        android.webkit.WebSettings settings = getBridge().getWebView().getSettings();
        settings.setCacheMode(android.webkit.WebSettings.LOAD_NO_CACHE);
        getBridge().getWebView().clearCache(true);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            "sac_buy_nothing_alerts",
            "Community alerts",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Messages, listings, and pickup updates");

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
