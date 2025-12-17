export interface TransitionState {
  isTransitioning: boolean;
  message: string;
}

export interface ResponsiveState {
  isMobile: boolean;
  isSmallScreen: boolean;
  isPanelCollapsed: boolean;
}

export interface RuntimeParamsState {
  facet_kp: number;
  command_vel_x: number;
  use_setpoint: boolean;
  compliant_mode: boolean;
}

export interface StatusState {
  state: number; // 0: loading, 1: ready, <0: error
  extra_error_message: string;
  urlParamErrorMessage: string;
}
