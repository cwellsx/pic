import './editConfig.sass';

import * as React from 'react';

import type { Config, ConfigProperty } from "../shared-types";

type EditConfigProps = {
  config: Config;
  setConfig: (config: Config) => void;
};

export const EditConfig: React.FunctionComponent<EditConfigProps> = (props: EditConfigProps) => {
  const { config, setConfig } = props;

  const renderInput = (property: ConfigProperty) => {
    const title = property.charAt(0).toUpperCase() + property.slice(1);
    const value = config.paths[property];
    const onChange = () => {
      const clone = { ...config }; // clone because otherwise setState won't notice that the object has changed
      clone.paths[property] = !value;
      setConfig(clone);
    };
    return (
      <li key={property}>
        <label>
          <input type="checkbox" checked={value} onChange={onChange} />
          {title}
        </label>
      </li>
    );
  };

  return <ul id="editConfig">{Object.keys(config.paths).map((key) => renderInput(key as ConfigProperty))}</ul>;
};
