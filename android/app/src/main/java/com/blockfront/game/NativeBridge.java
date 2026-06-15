package com.blockfront.game;

import android.content.Context;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;

public class NativeBridge {

    private final Context context;

    public NativeBridge(Context context) {
        this.context = context;
    }

    @JavascriptInterface
    public void vibrate(int ms) {

        Vibrator v =
            (Vibrator)
            context.getSystemService(
                Context.VIBRATOR_SERVICE
            );

        if(v != null) {
            v.vibrate(ms);
        }
    }

    @JavascriptInterface
    public int getRam() {
        return 4096;
    }

    @JavascriptInterface
    public int getRefreshRate() {
        return 60;
    }
}
