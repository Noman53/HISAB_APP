export type LaunchChoice = 'guest' | 'account' | null;
export type LaunchDestination = '/welcome' | '/onboarding' | '/(tabs)';
export const LAUNCH_CHOICE_KEY = 'hisab.launch.choice.v1';

export function getLaunchDestination(setupComplete: boolean, choice: LaunchChoice, authenticated: boolean): LaunchDestination {
  if (!choice && !authenticated) return '/welcome';
  return setupComplete ? '/(tabs)' : '/onboarding';
}
