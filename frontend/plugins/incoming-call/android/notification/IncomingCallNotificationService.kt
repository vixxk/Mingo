package com.talkmingo.app.notification

import androidx.annotation.Keep
import com.talkmingo.app.IncomingCallNotifications
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension
import org.json.JSONObject

/**
 * OneSignal Android Notification Service Extension.
 *
 * Intercepts push notifications before OneSignal displays them so incoming
 * audio/video calls show the WhatsApp-style full-screen card with a looping
 * ringtone even while the app is backgrounded or killed (the in-app
 * IncomingCallPopup already handles the foreground case).
 *
 * - `incoming_call`: replaces OneSignal's plain notification with our card.
 * - `call_cancelled`: the caller gave up — stop ringing and dismiss the card.
 * - anything else: left untouched, OneSignal displays it normally.
 *
 * Requires @Keep so R8 (minify is enabled in release builds) does not rename
 * the class — OneSignal resolves it by name via the manifest meta-data.
 */
@Keep
class IncomingCallNotificationService : INotificationServiceExtension {

    override fun onNotificationReceived(event: INotificationReceivedEvent) {
        val type: String
        try {
            type = event.notification.additionalData?.optString("type", "") ?: ""
        } catch (e: Exception) {
            return // Let OneSignal display normally.
        }
        if (type != "incoming_call" && type != "call_cancelled") return

        // We own these notifications from here on.
        event.preventDefault()

        try {
            when (type) {
                "incoming_call" -> {
                    if (IncomingCallNotifications.appInForeground) {
                        // The in-app popup + JS ringtone handle the foreground case.
                        return
                    }
                    val data = event.notification.additionalData ?: return
                    val payload = JSONObject()
                    for (key in INCOMING_CALL_KEYS) {
                        if (data.has(key)) payload.put(key, data.optString(key))
                    }
                    if (!payload.has("callId")) return
                    IncomingCallNotifications.showIncomingCall(event.context, payload)
                }
                "call_cancelled" -> {
                    // Stop ringing and dismiss the full-screen card/popup quietly
                    IncomingCallNotifications.stopIncomingCall(event.context)
                }
            }
        } catch (e: Exception) {
            // Never crash the notification pipeline; the push is simply dropped.
        }
    }

    private companion object {
        val INCOMING_CALL_KEYS = arrayOf(
            "callId", "roomId", "callerId", "callerName", "avatarIndex", "gender",
            "callerPhoto", "callType", "customRingtoneUrl",
            "agoraAppId", "agoraToken", "agoraChannel"
        )
    }
}
