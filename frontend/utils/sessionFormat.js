/**
 * Formatting helpers for call-session history cards.
 *
 * Audio→video converted calls are billed as two segments at different rates
 * (audio 10 coins/min, video 40 coins/min), so the history cards on both the
 * listener and user sides show each segment separately instead of a single
 * combined "X mins • Video" line — which made a converted call read as if it
 * had only ever been costed at the audio rate.
 */

/** e.g. "1 min Audio + 2 mins Video" for converted calls, "3 mins" otherwise. */
export const formatSessionDuration = (call) => {
  if (!call.isConverted) return `${call.duration || 0} mins`;
  const parts = [];
  if ((call.audioDuration || 0) > 0) {
    const a = call.audioDuration;
    parts.push(`${a} min${a > 1 ? 's' : ''} Audio`);
  }
  if ((call.videoDuration || 0) > 0) {
    const v = call.videoDuration;
    parts.push(`${v} min${v > 1 ? 's' : ''} Video`);
  }
  return parts.length ? parts.join(' + ') : `${call.duration || 0} mins`;
};

/** e.g. "Audio → Video" for converted calls, "Video" / "Audio" otherwise. */
export const formatSessionType = (call) => {
  if (call.isConverted && call.initialCallType && call.initialCallType !== call.callType) {
    return 'Audio → Video';
  }
  const t = call.callType || call.initialCallType || 'audio';
  return t.charAt(0).toUpperCase() + t.slice(1);
};
