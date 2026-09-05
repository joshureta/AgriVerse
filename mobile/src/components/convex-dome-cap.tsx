import Svg, { Path } from 'react-native-svg';

interface ConvexDomeCapProps {
  color?: string;
  height?: number;
}

export function ConvexDomeCap({ color = '#ffffd8', height = 34 }: ConvexDomeCapProps) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 100 34" preserveAspectRatio="none">
      <Path d="M 0,34 C 0,14.5 22.4,0 50,0 C 77.6,0 100,14.5 100,34 Z" fill={color} />
    </Svg>
  );
}
