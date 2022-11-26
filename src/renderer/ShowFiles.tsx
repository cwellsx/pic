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
  return (
    <div id="showFiles">
      {files.map((file) => (
        <div className="item" key={file.path}>
          <img src={file.thumbnailPath} />
          <span>{getFilename(file)}</span>
        </div>
      ))}
    </div>
  );
};
