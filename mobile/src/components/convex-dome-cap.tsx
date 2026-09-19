import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export interface ConvexDomeCapProps {
  color?: string;
  waveColor?: string;
  height?: number;
}

export function ConvexDomeCap({
  color = '#FFFFFF',
  waveColor = '#D8ECD9',
  height = 54,
}: ConvexDomeCapProps) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 400 56" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="wavyPanelMintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#D5EBD7" stopOpacity={0.96} />
          <Stop offset="50%" stopColor="#DEF1E0" stopOpacity={0.93} />
          <Stop offset="100%" stopColor="#D7ECD9" stopOpacity={0.96} />
        </LinearGradient>
      </Defs>

      {/* Layer 1: Background Mint Green Wave */}
      <Path
        d="M 0,22 C 30,9 60,4 95,4 C 145,4 185,15 230,24 C 265,31 300,37 340,36 C 365,35 385,31 400,27 L 400,56 L 0,56 Z"
        fill={waveColor === '#D8ECD9' ? 'url(#wavyPanelMintGrad)' : waveColor}
      />

      {/* Layer 2: Foreground Card Sheet Wave */}
      <Path
        d="M 0,38 C 35,23 75,13 115,13 C 160,13 200,24 245,34 C 280,41 310,45 345,43 C 370,41 388,40 400,39 L 400,56 L 0,56 Z"
        fill={color}
      />
    </Svg>
  );
}
