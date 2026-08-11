import { BlurTargetView } from 'expo-blur';
import { createRef, type PropsWithChildren } from 'react';
import type { View } from 'react-native';

export const taskCompletionBlurTargetRef = createRef<View>();

export function TaskCompletionBlurTarget({ children }: PropsWithChildren) {
  return (
    <BlurTargetView ref={taskCompletionBlurTargetRef} style={{ flex: 1 }}>
      {children}
    </BlurTargetView>
  );
}
