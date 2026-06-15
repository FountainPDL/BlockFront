package com.blockfront.game;

import android.content.Context;
import android.webkit.WebView;

public class GameWebView extends WebView {

    public GameWebView(Context context) {

        super(context);

        getSettings()
            .setJavaScriptEnabled(true);

        addJavascriptInterface(
            new NativeBridge(context),
            "Android"
        );
    }
}
