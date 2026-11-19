import { runtimeConfig as publicConfig } from './runtime-config.public';
/** Exclusivamente pruebas locales, seleccionadas explícitamente con --configuration integration. */
export const runtimeConfig = {
  ...publicConfig,
  apiUrl: 'http://localhost:4200/api/v1',
  realtimeUrl: 'http://localhost:4200',
  healthUrl: 'http://localhost:4200/q/health/ready',
  authEmulatorUrl: 'http://localhost:9099',
  firebase: {
    ...publicConfig.firebase,
    projectId: 'demo-app-meet',
    apiKey: 'demo-key',
    authDomain: 'localhost',
  },
  devAccess: false,
};
