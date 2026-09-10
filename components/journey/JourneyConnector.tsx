import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface JourneyConnectorProps {
  startOffset: 'left' | 'center' | 'right';
  endOffset: 'left' | 'center' | 'right';
  isCompleted?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function JourneyConnector({
  startOffset,
  endOffset,
  isCompleted = false,
}: JourneyConnectorProps) {
  const getX = (offset: 'left' | 'center' | 'right') => {
    switch (offset) {
      case 'left':
        return 75;
      case 'right':
        return SCREEN_WIDTH - 75;
      case 'center':
      default:
        return SCREEN_WIDTH / 2;
    }
  };

  const startX = getX(startOffset);
  const endX = getX(endOffset);
  const height = 44;

  // Cubic bezier curve connecting nodes
  const pathD = `M ${startX} 0 C ${startX} ${height * 0.55}, ${endX} ${height * 0.45}, ${endX} ${height}`;

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={SCREEN_WIDTH} height={height}>
        <Path
          d={pathD}
          stroke={isCompleted ? '#86EFAC' : '#D5CEBF'}
          strokeWidth={4}
          strokeDasharray="6, 5"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -6,
  },
});
