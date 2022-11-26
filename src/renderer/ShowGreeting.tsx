import './showGreeting.css';

import * as React from 'react';

type ShowGreetingProps = {
  greeting: string;
};

export const ShowGreeting: React.FunctionComponent<ShowGreetingProps> = (props: ShowGreetingProps) => {
  const { greeting } = props;
  return <div id="greeting">{greeting}</div>;
};
