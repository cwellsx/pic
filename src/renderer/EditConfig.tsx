import './editConfig.sass';

import * as React from 'react';

import type { Config, ConfigProperty, ConfigMore } from "../shared-types";

type EditConfigProps = {
  config: Config;
  setConfig: (config: Config) => void;
};

export const EditConfig: React.FunctionComponent<EditConfigProps> = (props: EditConfigProps) => {
  const { config, setConfig } = props;

  const [temp, setTemp] = React.useState<string>("");

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

  const renderMore = (tuple: ConfigMore, index: number) => {
    const [path, enabled, exists] = tuple;
    const onChange = () => {
      const clone = { ...config };
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const more = clone.more!;
      more[index][1] = !enabled;
      setConfig(clone);
    };
    const onDelete = () => {
      const clone = { ...config };
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const more = clone.more!;
      more.splice(index, 1);
      setConfig(clone);
    };
    return (
      <li key={path}>
        <label>
          <input type="checkbox" checked={enabled} onChange={onChange} disabled={!exists} />
          {path}
        </label>
        &nbsp;<span onClick={onDelete}>&#x274C;</span>
      </li>
    );
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTemp(event.target.value);
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const clone = { ...config };
    if (!clone.more) clone.more = [];
    clone.more.push([temp, false, false]);
    setConfig(clone);
  };

  return (
    <>
      <ul id="editConfig">
        {Object.keys(config.paths).map((key) => renderInput(key as ConfigProperty))}
        {config.more?.map(renderMore)}
      </ul>
      <input
        id="more"
        type="text"
        value={temp}
        onChange={onChange}
        onKeyUp={onKeyUp}
        placeholder="e.g. D:\ or E:\media"
      />
    </>
  );
};
