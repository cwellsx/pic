import * as React from 'react';

type RootPickerProps = {
  root: string;
  setRoot: (root: string) => void;
};

export const RootPicker: React.FunctionComponent<RootPickerProps> = (props: RootPickerProps) => {
  const { root, setRoot } = props;

  const [temp, setTemp] = React.useState<string>(root);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTemp(event.target.value);
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setRoot(temp);
    }
  };

  return (
    <div id="root">
      <input type="text" value={temp} onChange={onChange} onKeyUp={onKeyUp} />
    </div>
  );
};
