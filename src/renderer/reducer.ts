import { FileInfo } from '../shared-types';

/*
  The State data defined here is managed with useReducer instead of useState
  because it's several bits of related state e.g. the list of files and the array of which of these are selected
  which need to be changed as a result of several input actions e.g. new files, new clicks
*/

export type RenderedState = {
  files: FileInfo[];
  selected: boolean[];
  previousSelection: number | undefined;
};

export type ActionSetFiles = {
  type: "SetFiles";
  files: FileInfo[];
};

export type ActionMouseClick = {
  type: "MouseClick";
  index: number;
  isCtrlKey: boolean;
  isShiftKey: boolean;
};

export type Action = ActionSetFiles | ActionMouseClick;

function isSetFiles(action: Action): action is ActionSetFiles {
  return action.type === "SetFiles";
}
function isMouseClick(action: Action): action is ActionMouseClick {
  return action.type === "MouseClick";
}

function onSetFiles(state: RenderedState, action: ActionSetFiles): RenderedState {
  const { files } = action;
  const selected: boolean[] = new Array(files.length).fill(false);
  return { files, selected, previousSelection: undefined };
}

function onMouseClick(state: RenderedState, action: ActionMouseClick): RenderedState {
  const { index, isCtrlKey, isShiftKey } = action;
  const selected = state.selected;
  if (isShiftKey) {
    const other = state.previousSelection ?? index;
    const [lo, hi] = index > other ? [other, index] : [index, other];
    for (let i = 0; i < state.files.length; ++i) {
      if (i >= lo && i <= hi) selected[i] = true;
      else if (!isCtrlKey) selected[i] = false;
    }
  } else {
    if (isCtrlKey) selected[index] = !selected[index];
    else {
      selected.fill(false);
      selected[index] = true;
    }
  }
  return { files: state.files, selected, previousSelection: index };
}

export function reducer(state: RenderedState, action: Action): RenderedState {
  if (isSetFiles(action)) return onSetFiles(state, action);
  if (isMouseClick(action)) return onMouseClick(state, action);
  return state; // old state
}
