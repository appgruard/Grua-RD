package com.fouronesolutions.gruard;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.fouronesolutions.gruard.plugins.LocationTrackingPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocationTrackingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
