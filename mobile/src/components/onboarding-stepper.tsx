import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface OnboardingStepperProps {
  currentStep: 1 | 2 | 3;
  onStepPress?: (step: 1 | 2 | 3) => void;
}

export function OnboardingStepper({ currentStep, onStepPress }: OnboardingStepperProps) {
  const canPressStep1 = currentStep > 1 && !!onStepPress;
  const canPressStep2 = currentStep > 2 && !!onStepPress;

  return (
    <View style={styles.container}>
      {/* Row of Circles & Connecting Lines */}
      <View style={styles.circleRow}>
        {/* Step 1 Circle */}
        <Pressable
          disabled={!canPressStep1}
          onPress={() => onStepPress?.(1)}
          style={[
            styles.circle,
            currentStep > 1 && styles.circleDone,
            currentStep === 1 && styles.circleActive,
          ]}>
          {currentStep > 1 ? (
            <Check size={14} color="#FFFFFF" strokeWidth={3} />
          ) : (
            <Text style={[styles.circleText, currentStep === 1 && styles.circleTextActive]}>
              1
            </Text>
          )}
        </Pressable>

        {/* Connector 1: strictly between Circle 1 and Circle 2 */}
        <View
          style={[
            styles.connector,
            currentStep >= 2 ? styles.connectorDone : styles.connectorPending,
          ]}
        />

        {/* Step 2 Circle */}
        <Pressable
          disabled={!canPressStep2}
          onPress={() => onStepPress?.(2)}
          style={[
            styles.circle,
            currentStep > 2 && styles.circleDone,
            currentStep === 2 && styles.circleActive,
          ]}>
          {currentStep > 2 ? (
            <Check size={14} color="#FFFFFF" strokeWidth={3} />
          ) : (
            <Text style={[styles.circleText, currentStep === 2 && styles.circleTextActive]}>
              2
            </Text>
          )}
        </Pressable>

        {/* Connector 2: strictly between Circle 2 and Circle 3 */}
        <View
          style={[
            styles.connector,
            currentStep >= 3 ? styles.connectorDone : styles.connectorPending,
          ]}
        />

        {/* Step 3 Circle */}
        <View
          style={[
            styles.circle,
            currentStep === 3 && styles.circleActive,
          ]}>
          <Text style={[styles.circleText, currentStep === 3 && styles.circleTextActive]}>
            3
          </Text>
        </View>
      </View>

      {/* Row of Labels aligned exactly under each circle */}
      <View style={styles.labelRow}>
        <Pressable
          disabled={!canPressStep1}
          onPress={() => onStepPress?.(1)}
          style={styles.labelWrapper}>
          <Text
            style={[
              styles.label,
              currentStep > 1 && styles.labelDone,
              currentStep === 1 && styles.labelActive,
            ]}>
            Security
          </Text>
        </Pressable>

        <Pressable
          disabled={!canPressStep2}
          onPress={() => onStepPress?.(2)}
          style={styles.labelWrapper}>
          <Text
            style={[
              styles.label,
              currentStep > 2 && styles.labelDone,
              currentStep === 2 && styles.labelActive,
            ]}>
            Profile
          </Text>
        </Pressable>

        <View style={styles.labelWrapper}>
          <Text
            style={[
              styles.label,
              currentStep === 3 && styles.labelActive,
            ]}>
            Location
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 6,
    marginBottom: 14,
  },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  connector: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  connectorDone: {
    backgroundColor: '#18753a',
  },
  connectorPending: {
    backgroundColor: '#E2E8F0',
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  circleActive: {
    backgroundColor: '#18753a',
    borderColor: '#DCFCE7',
  },
  circleDone: {
    backgroundColor: '#18753a',
    borderColor: '#FFFFFF',
  },
  circleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  circleTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  labelWrapper: {
    width: 74,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  labelActive: {
    color: '#18753a',
    fontWeight: '800',
  },
  labelDone: {
    color: '#166534',
    fontWeight: '700',
  },
});
