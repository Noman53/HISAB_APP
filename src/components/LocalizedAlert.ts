import { Alert as NativeAlert, AlertButton, AlertOptions } from 'react-native';
import { translateText } from '@/i18n/translate';

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    NativeAlert.alert(
      translateText(title),
      message === undefined ? undefined : translateText(message),
      buttons?.map(button => ({ ...button, text: button.text ? translateText(button.text) : button.text })),
      options,
    );
  },
};
