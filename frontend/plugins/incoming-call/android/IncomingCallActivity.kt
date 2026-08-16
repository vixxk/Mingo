package app.themingo

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.drawee.generic.RoundingParams
import com.facebook.drawee.view.SimpleDraweeView
import org.json.JSONObject

/**
 * The WhatsApp-style incoming-call screen shown by the full-screen intent.
 *
 * Renders a compact card at the top ~10-15% of the screen (just below the
 * notification bar) with the caller's avatar, "Incoming Audio/Video Call",
 * the caller's name and Accept / Decline buttons. While it is visible it plays
 * the bundled ringtone in a loop (a notification sound only plays once, which
 * is not a ringtone) and vibrates.
 *
 * The activity is also the target of the notification's Accept/Decline action
 * buttons: when it receives an intent with [IncomingCallNotifications.EXTRA_ACTION]
 * it performs that action immediately (Accept/Open launch MainActivity — cold
 * start if the app was killed; Decline forwards to JS when the app is alive)
 * instead of showing the UI.
 */
class IncomingCallActivity : Activity() {

    private var ringtonePlayer: MediaPlayer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        IncomingCallNotifications.registerActivity(this)

        val payloadStr = intent.getStringExtra(IncomingCallNotifications.EXTRA_PAYLOAD)
        if (payloadStr == null) {
            finish()
            return
        }
        val payload = JSONObject(payloadStr)
        val action = intent.getStringExtra(IncomingCallNotifications.EXTRA_ACTION)

        if (action != null) {
            // Tapped an Accept/Decline/Open action button (or re-delivered intent).
            IncomingCallNotifications.handleCardAction(this, action, payload)
            finish()
            return
        }

        // Wake + show over the lock screen / any app (like a real phone call).
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )

        setContentView(buildUi(payload))
        startRinging(payload)
        startVibrating()

        // The notification channel plays the ringtone sound once for the
        // heads-up fallback. Now that IncomingCallActivity is open and playing
        // its own looping ringtone, re-post the notification silently so the
        // channel sound stops and doesn't overlap.
        silenceChannelNotification(payload)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val action = intent.getStringExtra(IncomingCallNotifications.EXTRA_ACTION)
        val payloadStr = intent.getStringExtra(IncomingCallNotifications.EXTRA_PAYLOAD)
        if (action != null && payloadStr != null) {
            IncomingCallNotifications.handleCardAction(this, action, JSONObject(payloadStr))
            finish()
        }
    }

    override fun onStop() {
        super.onStop()
        stopRinging()
        stopVibrating()
    }

    override fun onDestroy() {
        stopRinging()
        stopVibrating()
        IncomingCallNotifications.registerActivity(null)
        super.onDestroy()
    }

    // ── Ringtone + vibration ─────────────────────────────────────

    private fun startRinging(payload: JSONObject) {
        val customUrl = payload.optString("customRingtoneUrl")
        if (customUrl.isNotBlank()) {
            try {
                val parsed = Uri.parse(customUrl)
                if (parsed.scheme == "http" || parsed.scheme == "https") {
                    ringtonePlayer = MediaPlayer().apply {
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build()
                        )
                        setDataSource(this@IncomingCallActivity, parsed)
                        isLooping = true
                        setOnErrorListener { _, _, _ ->
                            playBundledRingtone()
                            true
                        }
                        setOnPreparedListener { start() }
                        prepareAsync()
                    }
                    return
                }
            } catch (e: Exception) {
                // Fall back to bundled ringtone
            }
        }
        playBundledRingtone()
    }

    private fun playBundledRingtone() {
        try {
            stopRinging()
            val uri = IncomingCallNotifications.getBundledRingtoneUri(this)
            ringtonePlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(this@IncomingCallActivity, uri)
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            // Final fallback to system default ringtone
            try {
                val defaultUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_RINGTONE)
                ringtonePlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    setDataSource(this@IncomingCallActivity, defaultUri)
                    isLooping = true
                    prepare()
                    start()
                }
            } catch (_: Exception) {
                ringtonePlayer = null
            }
        }
    }

    private fun stopRinging() {
        try {
            ringtonePlayer?.stop()
        } catch (e: Exception) {
            // ignore
        }
        ringtonePlayer?.release()
        ringtonePlayer = null
    }

    private fun startVibrating() {
        try {
            val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
            val pattern = longArrayOf(0, 1000, 1000)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(pattern, 0)
            }
        } catch (e: Exception) {
            // ignore
        }
    }

    private fun stopVibrating() {
        try {
            val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
            vibrator.cancel()
        } catch (e: Exception) {
            // ignore
        }
    }

    /**
     * Re-posts the call notification silently to cut the channel's one-shot
     * ringtone sound. The activity's MediaPlayer loop is already running, so
     * we don't want both playing at once.
     */
    private fun silenceChannelNotification(payload: JSONObject) {
        try {
            val callerName = payload.optString("callerName", "Mingo")
            val callType = payload.optString("callType", "audio")
            val title = "Incoming ${if (callType == "video") "Video" else "Audio"} Call"

            val openPending = PendingIntent.getActivity(
                this, 102,
                IncomingCallNotifications.buildMainActivityIntent(this, IncomingCallNotifications.ACTION_OPEN, payload),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val builder = NotificationCompat.Builder(this, IncomingCallNotifications.CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText("$callerName is calling you")
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(false)
                .setOngoing(true)
                .setSilent(true)
                .setContentIntent(openPending)
                .setColor(0xFFA855F7.toInt())

            NotificationManagerCompat.from(this).notify(IncomingCallNotifications.NOTIFICATION_ID, builder.build())
        } catch (e: Exception) {
            // Silencing failed — the channel sound will play its one-shot and stop.
        }
    }

    // ── UI ───────────────────────────────────────────────────────

    private fun buildUi(payload: JSONObject): View {
        val callerName = payload.optString("callerName", "Mingo")
        val callType = payload.optString("callType", "audio")
        val dp = resources.displayMetrics.density
        val screenHeight = resources.displayMetrics.heightPixels

        // Transparent root scrim so the phone home screen or active app underneath stays visible
        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
        }

        // Compact dark horizontal card matching Screenshot 2 & 3
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            elevation = 16f * dp
            setPadding((14 * dp).toInt(), (12 * dp).toInt(), (14 * dp).toInt(), (12 * dp).toInt())
            background = GradientDrawable().apply {
                cornerRadius = 24 * dp
                setColor(0xFF18151D.toInt()) // Sleek dark card container matching screenshots
            }
        }

        // 1. Avatar on the left with purple border ring
        val avatar = buildAvatar(callerName, 52f, dp, payload.optString("callerPhoto"))
        val avatarParams = LinearLayout.LayoutParams((52 * dp).toInt(), (52 * dp).toInt()).apply {
            gravity = Gravity.CENTER_VERTICAL
        }
        card.addView(avatar, avatarParams)

        // 2. Middle Caller Info Column
        val infoCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val subtitleView = TextView(this).apply {
            text = "Incoming ${if (callType == "video") "Video" else "Audio"} Call"
            setTextColor(0xFFC084FC.toInt()) // Light purple text (#C084FC)
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
        }
        val nameView = TextView(this).apply {
            text = callerName
            setTextColor(Color.WHITE)
            textSize = 18f
            typeface = Typeface.DEFAULT_BOLD
            maxLines = 1
        }

        infoCol.addView(subtitleView)
        infoCol.addView(nameView)

        val infoParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
            leftMargin = (12 * dp).toInt()
            rightMargin = (8 * dp).toInt()
            gravity = Gravity.CENTER_VERTICAL
        }
        card.addView(infoCol, infoParams)

        // 3. Right Action Buttons (Decline & Accept in single horizontal row)
        val actionRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val btnSize = (44 * dp).toInt()

        // Red circular Decline button with '✕' icon
        val declineBtn = buildActionButton("\u2715", 0xFFEF4444.toInt())
        
        // Green circular Accept button with phone '📞' or camera '📹' icon
        val acceptIcon = if (callType == "video") "\uD83C\uDFA5" else "\uD83D\uDCDE"
        val acceptBtn = buildActionButton(acceptIcon, 0xFF22C55E.toInt())

        declineBtn.setOnClickListener {
            IncomingCallNotifications.handleCardAction(this, IncomingCallNotifications.ACTION_DECLINE, payload)
            finish()
        }

        acceptBtn.setOnClickListener {
            IncomingCallNotifications.handleCardAction(this, IncomingCallNotifications.ACTION_ACCEPT, payload)
            finish()
        }

        actionRow.addView(declineBtn, LinearLayout.LayoutParams(btnSize, btnSize).apply {
            rightMargin = (10 * dp).toInt()
        })
        actionRow.addView(acceptBtn, LinearLayout.LayoutParams(btnSize, btnSize))

        val actionParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            gravity = Gravity.CENTER_VERTICAL
        }
        card.addView(actionRow, actionParams)

        // Floating top position (just below top status bar / notch)
        val cardParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            topMargin = (screenHeight * 0.04f).toInt() + (14 * dp).toInt()
            leftMargin = (12 * dp).toInt()
            rightMargin = (12 * dp).toInt()
        }
        root.addView(card, cardParams)

        return root
    }

    private fun buildAvatar(name: String, size: Float, dp: Float, photoUrl: String): View {
        val ring = FrameLayout(this)
        ring.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.TRANSPARENT)
            setStroke((2 * dp).toInt(), 0xFFA855F7.toInt())
        }
        val innerSize = (size * 0.86f).toInt()

        // Dark circle + initial-letter fallback
        val circle = FrameLayout(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(0xFF2A2A2A.toInt())
            }
        }
        val letter = TextView(this).apply {
            text = name.firstOrNull()?.uppercase() ?: "?"
            setTextColor(Color.WHITE)
            textSize = 18f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        circle.addView(letter, FrameLayout.LayoutParams(innerSize, innerSize, Gravity.CENTER))

        if (photoUrl.isNotBlank()) {
            try {
                if (!Fresco.hasBeenInitialized()) {
                    Fresco.initialize(this)
                }
                val photo = SimpleDraweeView(this).apply {
                    hierarchy?.setRoundingParams(RoundingParams.asCircle())
                }
                photo.setImageURI(Uri.parse(photoUrl))
                circle.addView(photo, FrameLayout.LayoutParams(innerSize, innerSize, Gravity.CENTER))
            } catch (e: Exception) {
                // Photo load unavailable — initial letter fallback shows
            }
        }

        ring.addView(circle, FrameLayout.LayoutParams(innerSize, innerSize, Gravity.CENTER))
        return ring
    }

    private fun buildActionButton(label: String, color: Int): TextView =
        TextView(this).apply {
            text = label
            textSize = 18f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(color)
            }
        }
}
