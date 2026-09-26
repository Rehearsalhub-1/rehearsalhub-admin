import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './attendanceStyles';

export function generateAttendanceCode(length = 6): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface AttendanceCodeManagerProps {
  initialCode?: string;
  onCodeChange?: (newCode: string) => void;
}

export default function AttendanceCodeManager({
  initialCode = 'RH-ATT',
  onCodeChange,
}: AttendanceCodeManagerProps) {
  const [code, setCode] = useState(initialCode);
  const [secondsRemaining, setSecondsRemaining] = useState(4);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          const next = generateAttendanceCode();
          setCode(next);
          onCodeChange?.(next);
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onCodeChange]);

  const handleRotate = () => {
    const next = generateAttendanceCode();
    setCode(next);
    setSecondsRemaining(4);
    onCodeChange?.(next);
  };

  const timerDisplay = `${secondsRemaining}s`;

  return (
    <View style={styles.dateFilterStrip}>
      <View style={styles.dateCenterInfo}>
        <Ionicons name="key-outline" size={14} color="#7c3aed" style={{ marginRight: 6 }} />
        <Text style={styles.dateLabelText}>Code: {code}</Text>
        <Text style={styles.dateSubText}>({timerDisplay})</Text>
      </View>
      <TouchableOpacity
        style={styles.dateArrowBtn}
        onPress={handleRotate}
        activeOpacity={0.7}
      >
        <Ionicons name="refresh" size={14} color="#7c3aed" />
      </TouchableOpacity>
    </View>
  );
}
