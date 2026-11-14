import { HttpContextToken } from '@angular/common/http';
/** Logout still sends Bearer but must not trigger token refresh or another logout. */
export const SKIP_AUTH_RECOVERY = new HttpContextToken<boolean>(() => false);
