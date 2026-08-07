import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ms, s, vs } from '../../utils/responsive';

const formatElapsed = (totalSecs) => {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const sec = totalSecs % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/**
 * Call duration timer pill — sits at the top of the call screens and counts
 * up while `active` is true. Uses a stable start timestamp so the elapsed
 * time is accurate even if the interval is re-created.
 */
const CallTimer = ({ active, style }) => {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (active) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      const tick = () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active]);

  return (
    <View style={[styles.pill, style]}>
      <Ionicons name="time-outline" size={ms(13)} color="#fff" />
      <Text style={styles.time}>{formatElapsed(elapsed)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: s(12),
    paddingVertical: vs(5),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  time: {
    color: '#fff',
    fontSize: ms(13, 0.3),
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
});

export default CallTimer;
