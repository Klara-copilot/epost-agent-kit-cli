// Environment detection utilities
export const isCI = !!process.env.CI;
export const noColor = !!process.env.NO_COLOR || isCI;
export const isVerbose = !!process.env.VERBOSE;
