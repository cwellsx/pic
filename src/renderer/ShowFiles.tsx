import './showFiles.sass';

import * as React from 'react';

import { FileInfo } from '../shared-types';
import { Action, RenderedState } from './reducer';

export function getFilename(file: FileInfo): string {
  const path = file.path;
  const split = path.split("\\");
  return split[split.length - 1];
}

type ShowFilesProps = {
  state: RenderedState;
  dispatch: (action: Action) => void;
};

export const ShowFiles: React.FunctionComponent<ShowFilesProps> = (props: ShowFilesProps) => {
  const { state, dispatch } = props;

  const renderFile = (file: FileInfo, index: number) => {
    const clickEvent = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const isCtrlKey = e.ctrlKey;
      const isShiftKey = e.shiftKey;
      dispatch({ type: "MouseClick", isCtrlKey, isShiftKey, index });
    };
    const isSelected = state.selected[index];
    const className = !isSelected ? "item" : "item selected";
    return (
      <div className={className} key={file.path} onClick={clickEvent}>
        <img src={file.thumbnailUrl} />
        <span>{getFilename(file)}</span>
      </div>
    );
  };

  return <div id="showFiles">{state.files.map(renderFile)}</div>;
};
