import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export default function LoginScreen({ onLoginSuccess, onGuestLogin }) {
  const [username, setUsername] = useState('it@workwize.in');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const demoAccounts = [
    {
      name: 'IT (App admin)',
      user: 'it@workwize.in',
      pwd: 'password123',
    },
    {
      name: 'HK Manager',
      user: 'hk_mgr@workwize.in',
      pwd: 'password123',
    },
    {
      name: 'Security Officer',
      user: 'sec_officer@workwize.in',
      pwd: 'password123',
    },
  ];

  const handleFillDemo = (acc) => {
    setUsername(acc.user);
    setPassword(acc.pwd);
    setErrorMsg('');
  };

  const handleSignIn = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      await onLoginSuccess(username.trim(), password.trim());
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Exact gradient background from workwize-teal login.html */}
        <LinearGradient
          colors={['#EBF1FD', '#DDE6FA', '#E8F4E6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBg}
        >
          {/* Pure White Card matching login.html .login-card */}
          <View style={styles.card}>
            {/* Brand Header */}
            <View style={styles.brandHeader}>
              <View style={styles.logoWrap}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>Sign In</Text>
              <Text style={styles.caption}>
                Enter your credentials to access WorkWize Daily Jobs
              </Text>
            </View>

            {/* Error Message */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={15} color={Colors.red} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Form Fields */}
            <View style={styles.form}>
              {/* Username / Email */}
              <Text style={styles.fieldLabel}>EMAIL OR USERNAME</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. it@workwize.in"
                  placeholderTextColor={Colors.placeholder}
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t);
                    setErrorMsg('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>

              {/* Password */}
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.placeholder}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setErrorMsg('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={18}
                    color={Colors.muted}
                  />
                </TouchableOpacity>
              </View>

              {/* Sign In Button (WorkWize Primary Blue) */}
              <TouchableOpacity
                style={styles.signInBtn}
                onPress={handleSignIn}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.signInBtnText}>Sign In</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Demo Accounts (Exact match to login.html .demo-accounts) */}
            <View style={styles.demoSection}>
              <View style={styles.demoTitleRow}>
                <Feather name="users" size={14} color={Colors.muted} />
                <Text style={styles.demoTitle}>QUICK DEMO ACCOUNTS (CLICK TO FILL):</Text>
              </View>

              <View style={styles.demoChips}>
                {demoAccounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.user}
                    style={[
                      styles.demoChip,
                      username === acc.user && styles.demoChipActive,
                    ]}
                    onPress={() => handleFillDemo(acc)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.demoChipText,
                        username === acc.user && styles.demoChipTextActive,
                      ]}
                    >
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Direct Guest / Offline Access Button */}
            <TouchableOpacity
              style={styles.guestAccessBtn}
              onPress={onGuestLogin}
              activeOpacity={0.8}
            >
              <Feather name="zap" size={14} color={Colors.primary} />
              <Text style={styles.guestAccessText}>Enter Dashboard as Demo / Guest</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Info */}
          <View style={styles.footer}>
            <Text style={styles.footerCopy}>&copy; 2023-2026 WorkWize . All Rights Reserved</Text>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
    backgroundColor: '#F2F5FB',
  },
  scrollContent: {
    flexGrow: 1,
  },
  gradientBg: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E3E8F5',
    padding: 24,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoWrap: {
    height: 48,
    width: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: 4,
  },
  caption: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.red,
    fontWeight: '600',
  },
  form: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.line,
    paddingHorizontal: 12,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.ink,
  },
  eyeBtn: {
    padding: 6,
  },
  signInBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  signInBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  demoSection: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  demoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  demoTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  demoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoChip: {
    backgroundColor: '#F0F4FD',
    borderWidth: 1,
    borderColor: '#D9E3F8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  demoChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  demoChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  demoChipTextActive: {
    color: '#FFFFFF',
  },
  guestAccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#E8ECF8',
    borderWidth: 1,
    borderColor: '#D5DCEE',
  },
  guestAccessText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerCopy: {
    fontSize: 11,
    color: Colors.muted,
  },
});
