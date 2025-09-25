import * as constants from "./constants.js";

let state = {
  socketId: null,
  localStream: null,
  remoteStream: null,
  screenSharingStream: null,
  screenSharingActive: false,
  alowConnectionsFromStrangers: false,
  callState: constants.callState.CALL_AVAILABLE_ONLY_CHAT,
};

export const setSocketId = (socketId) => {
  state = {
    ...state,
    socketId,
  };
};

export const setLocalStream = (stream) => {
  state = {
    ...state,
    localStream: stream,
  };
};

export const setAllowConnectionsFromStrangers = (allowConnection) => {
  state = {
    ...state,
    alowConnectionsFromStrangers: allowConnection,
  };
};

export const setStreamSharingActive = (stream) => {
  state = {
    ...state,
    screenSharingActive: stream,
  };
};

export const setScreenSharingActive = (stream) => {
  state = {
    ...state,
    screenSharingActive: stream,
  };
};

export const setStreamSharingStream = (stream) => {
  state = {
    ...state,
    screenSharingStream: stream,
  };
};

export const setRemoteStream = (stream) => {
  state = {
    ...state,
    remoteStream: stream,
  };
};

export const setCallState = (callState) => {
  state = {
    ...state,
    callState,
  };
};

export const getState = () => {
  return state;
};
