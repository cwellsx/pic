import * as React from 'react';

const enabled = false;

export const ShowFonts: React.FunctionComponent = () => {
  if (!enabled) return <></>;
  return (
    <ul>
      <li style={{ fontFamily: "Segoe UI" }}>Sample text</li>
      <li style={{ fontFamily: "Segoe UI", fontSize: "12pt" }}>Sample text (12)</li>
      <li style={{ fontFamily: "Segoe UI", fontSize: "11pt" }}>Sample text (11)</li>
      <li style={{ fontFamily: "Segoe UI", fontSize: "10pt" }}>Sample text (10)</li>
      <li style={{ fontFamily: "Segoe UI", fontSize: "9pt" }}>Sample text (9)</li>
      <li style={{ fontFamily: "Segoe UI" }}>Segoe UI</li>
      <li style={{ fontFamily: "Roboto" }}>Roboto</li>
      <li style={{ fontFamily: "Helvetica" }}>Helvetica</li>
      <li style={{ fontFamily: "Arial" }}>Arial</li>
      <li style={{ fontFamily: "sans-serif" }}>Sans-serif</li>
      <li style={{ fontFamily: "monospace" }}>Monospace</li>
    </ul>
  );
};
