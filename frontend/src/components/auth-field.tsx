import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextStyle,
  type TextInputProps,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

// the field draws its own focus line, so drop the browser's default ring
const WEB_FOCUS_RESET =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;

export function AuthField({
  label,
  secure = false,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextInputProps & {
  /** Visible label above the field; also the screen-reader name. */
  label: string;
  /** Renders a show/hide toggle and masks the value. */
  secure?: boolean;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.row,
          { borderBottomColor: focused ? theme.accent : theme.border },
        ]}>
        <TextInput
          {...rest}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          style={[styles.input, { color: theme.text }, WEB_FOCUS_RESET, style]}
          placeholderTextColor={theme.textSecondary}
          selectionColor={theme.accent}
          cursorColor={theme.accent}
          secureTextEntry={secure && !revealed}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={6}
            onPress={() => setRevealed((value) => !value)}
            style={styles.eye}>
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    minHeight: 44,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 22,
  },
  eye: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
