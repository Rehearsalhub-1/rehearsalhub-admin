import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './memberManagementStyles';

interface MemberContactFormProps {
  firstName: string;
  setFirstName: (val: string) => void;
  lastName: string;
  setLastName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  alias: string;
  setAlias: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
}

export default function MemberContactForm({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  phone,
  setPhone,
  username,
  setUsername,
  alias,
  setAlias,
  newPassword,
  setNewPassword,
  showPassword,
  setShowPassword,
}: MemberContactFormProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeading}>Contact & Login Details</Text>

      <View style={styles.twoColRow}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
          <Text style={styles.inputLabel}>First Name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor="#94a3b8"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
          <Text style={styles.inputLabel}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      <View style={styles.twoColRow}>
        <View style={[styles.inputGroup, { flex: 1.2, marginRight: 6 }]}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
          <Text style={styles.inputLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="phone"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.twoColRow}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
          <Text style={styles.inputLabel}>Login Alias (@)</Text>
          <TextInput
            style={styles.input}
            value={alias}
            onChangeText={setAlias}
            placeholder="alias"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Reset Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Leave blank to keep current password..."
            placeholderTextColor="#94a3b8"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
