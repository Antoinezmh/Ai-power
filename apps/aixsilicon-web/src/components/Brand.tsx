/** The power-device symbol doubles as the connector in AI × Power. */
export function Brand() {
  return (
    <span aria-label="AI × Power" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: 650, letterSpacing: '-0.045em', lineHeight: 1 }}>
      <span aria-hidden="true">AI</span>
      <img src="/ai-power-logo.svg" alt="" width={32} height={32} style={{ flexShrink: 0 }} />
      <span aria-hidden="true">Power</span>
    </span>
  );
}
