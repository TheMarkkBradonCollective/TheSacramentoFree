package org.sacramentobuynothing.app;

import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Native turn-by-turn speech. Android WebView speechSynthesis is often silent
 * (no TTS engine visible to the app, empty voices, or gesture-locked).
 */
@CapacitorPlugin(name = "NavigationTts")
public class NavigationTtsPlugin extends Plugin {

    private TextToSpeech tts;
    private boolean ready = false;
    private boolean initStarted = false;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private final Map<String, PluginCall> pendingUtterances = new HashMap<>();
    private final List<PendingSpeak> waitingForEngine = new ArrayList<>();

    private static final class PendingSpeak {
        final PluginCall call;
        final String text;

        PendingSpeak(PluginCall call, String text) {
            this.call = call;
            this.text = text;
        }
    }

    @Override
    public void load() {
        audioManager = (AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
        startEngine();
    }

    @PluginMethod
    public void warmup(PluginCall call) {
        startEngine();
        JSObject result = new JSObject();
        result.put("available", true);
        call.resolve(result);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.trim().isEmpty()) {
            JSObject result = new JSObject();
            result.put("spoken", true);
            call.resolve(result);
            return;
        }
        final String spoken = text.trim();
        if (getActivity() == null) {
            JSObject result = new JSObject();
            result.put("spoken", false);
            call.resolve(result);
            return;
        }
        getActivity().runOnUiThread(() -> speakOnMain(call, spoken));
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (getActivity() == null) {
            call.resolve();
            return;
        }
        getActivity().runOnUiThread(() -> {
            waitingForEngine.clear();
            finishAllPending();
            if (tts != null) {
                tts.stop();
            }
            abandonFocus();
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        waitingForEngine.clear();
        finishAllPending();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        ready = false;
        initStarted = false;
        abandonFocus();
        super.handleOnDestroy();
    }

    private void startEngine() {
        if (initStarted || tts != null) return;
        if (getActivity() == null) return;
        getActivity().runOnUiThread(this::startEngineOnMain);
    }

    private void startEngineOnMain() {
        if (initStarted || tts != null) return;
        initStarted = true;
        tts = new TextToSpeech(getContext(), status -> {
            ready = status == TextToSpeech.SUCCESS;
            if (ready && tts != null) {
                int lang = tts.setLanguage(Locale.US);
                if (lang == TextToSpeech.LANG_MISSING_DATA || lang == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(Locale.getDefault());
                }
                tts.setSpeechRate(0.98f);
                tts.setPitch(1.0f);
                tts.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                );
                tts.setOnUtteranceProgressListener(
                    new UtteranceProgressListener() {
                        @Override
                        public void onStart(String utteranceId) {
                            // no-op
                        }

                        @Override
                        public void onDone(String utteranceId) {
                            finishUtterance(utteranceId);
                        }

                        @Override
                        public void onError(String utteranceId) {
                            finishUtterance(utteranceId);
                        }

                        @Override
                        public void onError(String utteranceId, int errorCode) {
                            finishUtterance(utteranceId);
                        }
                    }
                );
            }
            flushWaiting();
        });
    }

    private void speakOnMain(PluginCall call, String text) {
        startEngineOnMain();
        if (!ready || tts == null) {
            waitingForEngine.add(new PendingSpeak(call, text));
            return;
        }
        enqueueSpeak(call, text);
    }

    private void flushWaiting() {
        List<PendingSpeak> queued = new ArrayList<>(waitingForEngine);
        waitingForEngine.clear();
        if (!ready || tts == null) {
            for (PendingSpeak pending : queued) {
                resolveSpoken(pending.call, false);
            }
            return;
        }
        for (PendingSpeak pending : queued) {
            enqueueSpeak(pending.call, pending.text);
        }
    }

    private void enqueueSpeak(PluginCall call, String text) {
        requestFocus();
        String utteranceId = UUID.randomUUID().toString();
        pendingUtterances.put(utteranceId, call);
        Bundle params = new Bundle();
        params.putString(TextToSpeech.Engine.KEY_PARAM_STREAM, String.valueOf(AudioManager.STREAM_MUSIC));
        int result = tts.speak(text, TextToSpeech.QUEUE_ADD, params, utteranceId);
        if (result != TextToSpeech.SUCCESS) {
            pendingUtterances.remove(utteranceId);
            resolveSpoken(call, false);
        }
    }

    private void finishUtterance(String utteranceId) {
        PluginCall call = pendingUtterances.remove(utteranceId);
        if (call != null) {
            resolveSpoken(call, true);
        }
        if (pendingUtterances.isEmpty()) {
            abandonFocus();
        }
    }

    private void finishAllPending() {
        for (PluginCall call : pendingUtterances.values()) {
            resolveSpoken(call, false);
        }
        pendingUtterances.clear();
    }

    private void resolveSpoken(PluginCall call, boolean spoken) {
        JSObject result = new JSObject();
        result.put("spoken", spoken);
        call.resolve(result);
    }

    private void requestFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest == null) {
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(
                        new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                    .build();
            }
            audioManager.requestAudioFocus(focusRequest);
        } else {
            audioManager.requestAudioFocus(
                null,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
            );
        }
    }

    private void abandonFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest);
            }
        } else {
            audioManager.abandonAudioFocus(null);
        }
    }
}
