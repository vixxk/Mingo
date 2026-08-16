package app.themingo

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

/**
 * Bridges the native incoming-call card to JS.
 *
 * JS -> native: stopIncomingCall (dismiss card/ringtone), showIncomingCall
 * (socket fired while backgrounded), getPendingCallAction (cold start from the
 * card's Accept/Decline when the app was killed).
 *
 * native -> JS: emits `IncomingCallAction` ({ action, payload }) when
 * MainActivity receives a new intent from the card while the app is running
 * (backgrounded), and tracks the app foreground state via the React lifecycle
 * so the OneSignal extension knows whether to show the card or let the in-app
 * popup handle the call.
 */
class IncomingCallModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    LifecycleEventListener,
    ActivityEventListener {

    override fun getName(): String = "IncomingCallModule"

    init {
        reactContext.addLifecycleEventListener(this)
        reactContext.addActivityEventListener(this)
        IncomingCallNotifications.reactInstanceAlive = reactContext.hasActiveReactInstance()
        IncomingCallNotifications.emitActionToJs = { action, payloadJson ->
            emitCallAction(action, payloadJson)
        }
    }

    // ── JS -> Native ──────────────────────────────────────────────

    /** Dismisses the native call card + notification + ringtone. */
    @ReactMethod
    fun stopIncomingCall() {
        try {
            IncomingCallNotifications.stopIncomingCall(reactContext)
        } catch (e: Exception) {
            // ignore
        }
    }

    /** Closes the card + stops the ringtone, keeping the shade notification. */
    @ReactMethod
    fun dismissCard() {
        try {
            IncomingCallNotifications.dismissCard()
        } catch (e: Exception) {
            // ignore
        }
    }

    /** Shows the native call card (used when the socket fires while the app is
     *  backgrounded but still running — before the push arrives). */
    @ReactMethod
    fun showIncomingCall(payload: ReadableMap) {
        try {
            val json = JSONObject()
            val iterator = payload.keySetIterator()
            while (iterator.hasNextKey()) {
                val key = iterator.nextKey()
                when (payload.getType(key)) {
                    ReadableType.String -> json.put(key, payload.getString(key))
                    ReadableType.Number -> json.put(key, payload.getDouble(key))
                    ReadableType.Boolean -> json.put(key, payload.getBoolean(key))
                    ReadableType.Null -> json.put(key, JSONObject.NULL)
                    else -> json.put(key, payload.getString(key))
                }
            }
            IncomingCallNotifications.showIncomingCall(reactContext, json)
        } catch (e: Exception) {
            // Invalid payload — nothing to show.
        }
    }

    /** Returns the accept/decline/open action that cold-started the app from
     *  the native call card, or null. Cleared after being read so a remount
     *  does not re-process it. */
    @ReactMethod
    fun getPendingCallAction(callback: Callback) {
        try {
            val intent = reactContext.currentActivity?.intent
            val action = intent?.getStringExtra(IncomingCallNotifications.EXTRA_ACTION)
            val payloadStr = intent?.getStringExtra(IncomingCallNotifications.EXTRA_PAYLOAD)
            if (action != null && payloadStr != null) {
                intent.removeExtra(IncomingCallNotifications.EXTRA_ACTION)
                intent.removeExtra(IncomingCallNotifications.EXTRA_PAYLOAD)
                callback.invoke(action, payloadStr)
            } else {
                callback.invoke(null, null)
            }
        } catch (e: Exception) {
            callback.invoke(null, null)
        }
    }
    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactContext))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + reactContext.packageName)
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("PERM_ERR", e.message)
        }
    }

    // ── Native -> JS ─────────────────────────────────────────────

    private fun emitCallAction(action: String, payloadJson: String) {
        if (!reactContext.hasActiveReactInstance()) return
        val map: WritableMap = Arguments.createMap().apply {
            putString("action", action)
            putString("payload", payloadJson)
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("IncomingCallAction", map)
    }

    // ── App lifecycle → native foreground flag ───────────────────

    override fun onHostResume() {
        IncomingCallNotifications.setAppInForeground(true)
        IncomingCallNotifications.reactInstanceAlive = true
    }

    override fun onHostPause() {
        IncomingCallNotifications.setAppInForeground(false)
    }

    override fun onHostDestroy() {
        IncomingCallNotifications.reactInstanceAlive = false
    }

    // ── MainActivity warm-launch intents from the call card ──────

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        // not used
    }

    override fun onNewIntent(intent: Intent) {
        val action = intent.getStringExtra(IncomingCallNotifications.EXTRA_ACTION)
        val payloadStr = intent.getStringExtra(IncomingCallNotifications.EXTRA_PAYLOAD)
        if (action != null && payloadStr != null) {
            intent.removeExtra(IncomingCallNotifications.EXTRA_ACTION)
            intent.removeExtra(IncomingCallNotifications.EXTRA_PAYLOAD)
            emitCallAction(action, payloadStr)
        }
    }
}
