interface LabelChipProps {
  label: string;
}

/** Deterministic hue from the label text so each label keeps a stable color. */
function labelHue(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

export default function LabelChip({ label }: LabelChipProps) {
  const hue = labelHue(label);
  return (
    <span
      className="label-chip"
      style={{
        backgroundColor: `hsl(${hue} 70% 50% / 0.18)`,
        color: `hsl(${hue} 65% 38%)`,
        borderColor: `hsl(${hue} 60% 50% / 0.35)`,
      }}
    >
      {label}
    </span>
  );
}
