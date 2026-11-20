import { Switch as NativeSwitch, SwitchProps, TextInput, TextInputProps, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useLanguage } from '@/i18n/LanguageProvider';

export function LocalizedTextInput(props: TextInputProps) {
  const { translate } = useLanguage();
  return <TextInput
    {...props}
    accessibilityLabel={props.accessibilityLabel ? translate(props.accessibilityLabel) : undefined}
    accessibilityHint={props.accessibilityHint ? translate(props.accessibilityHint) : undefined}
    placeholder={props.placeholder ? translate(props.placeholder) : undefined}
  />;
}

export function LocalizedTouchableOpacity(props: TouchableOpacityProps) {
  const { translate } = useLanguage();
  return <TouchableOpacity
    {...props}
    accessibilityLabel={props.accessibilityLabel ? translate(props.accessibilityLabel) : undefined}
    accessibilityHint={props.accessibilityHint ? translate(props.accessibilityHint) : undefined}
  />;
}

export function LocalizedSwitch(props: SwitchProps) {
  const { translate } = useLanguage();
  return <NativeSwitch
    {...props}
    accessibilityLabel={props.accessibilityLabel ? translate(props.accessibilityLabel) : undefined}
    accessibilityHint={props.accessibilityHint ? translate(props.accessibilityHint) : undefined}
  />;
}
