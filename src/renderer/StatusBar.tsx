//import './StatusBar.css';
import * as React from 'react';

type StatusBarProps = {
  status: string;
};

export const StatusBar: React.FunctionComponent<StatusBarProps> = (props: StatusBarProps) => {
  const { status } = props;

  return <div id="status">{status}</div>;
};
