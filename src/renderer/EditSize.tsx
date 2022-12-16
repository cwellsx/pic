import * as React from 'react';

import { ConfigUI } from '../shared-types';

type EditSizeProps = {
  configUI: ConfigUI;
  setConfigUI: (configUI: ConfigUI) => void;
};

export const EditSize: React.FunctionComponent<EditSizeProps> = (props: EditSizeProps) => {
  const { configUI, setConfigUI } = props;
  const size = configUI.size ?? 96;
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(event.target.value);
    const clone = { ...configUI };
    clone.size = newSize;
    setConfigUI(clone);
    document.getElementById("showFiles")?.style.setProperty("--thumb-size", newSize + "px");
  };
  return (
    <div>
      <input type="range" min={96} max={256} onChange={onChange} defaultValue={size} />
      {"" + size}
    </div>
  );
};
