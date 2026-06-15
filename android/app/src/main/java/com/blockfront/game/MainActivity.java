package com.blockfront.game;

import android.app.Activity;
import android.os.Bundle;

public class MainActivity extends Activity {

    @Override
    protected void onCreate(
        Bundle savedInstanceState
    ) {

        super.onCreate(
            savedInstanceState
        );

        GameWebView webView =
            new GameWebView(this);

        setContentView(webView);

        webView.loadUrl(
            "file:///android_asset/index.html"
        );
    }
}
