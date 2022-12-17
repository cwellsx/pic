import './showFiles.sass';

import * as React from 'react';

import { FileInfo } from '../shared-types';

function getFilename(file: FileInfo): string {
  const path = file.path;
  const split = path.split("\\");
  return split[split.length - 1].toLowerCase();
}

type ShowFilesProps = {
  files: FileInfo[];
};

export const ShowFiles: React.FunctionComponent<ShowFilesProps> = (props: ShowFilesProps) => {
  const { files } = props;
  const [selected, setSelected] = React.useState<boolean[]>(new Array(files.length).fill(false));
  const [previous, setPrevious] = React.useState<number | undefined>(undefined);

  const renderFile = (file: FileInfo, index: number) => {
    const clickEvent = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const isCtrlKey = e.ctrlKey;
      const isShiftKey = e.shiftKey;
      const cloned = [...selected];
      if (isShiftKey) {
        let other = previous ?? index;
        // ensure index < other
        if (index > other) [other, index] = [index, other];
        for (let i = 0; i < files.length; ++i) {
          if (i >= index && i <= other) cloned[i] = true;
          else if (!isCtrlKey) cloned[i] = false;
        }
      } else {
        if (isCtrlKey) cloned[index] = !cloned[index];
        else {
          cloned.fill(false);
          cloned[index] = true;
        }
      }
      setPrevious(index);
      setSelected(cloned);
    };
    const isSelected = selected[index];
    const className = !isSelected ? "item" : "item selected";
    return (
      <div className={className} key={file.path} onClick={clickEvent}>
        <img src={file.thumbnailUrl} />
        <span>{getFilename(file)}</span>
      </div>
    );
  };

  return <div id="showFiles">{files.map(renderFile)}</div>;
};
