import { runtimeConfig } from '../config/runtime-config';
import { isDevAccessActive } from './dev-access';

describe('dev access flag', () => {
  afterEach(() => sessionStorage.removeItem('frontmeet.dev-access'));

  it('keeps development bypass disabled even when the session flag is set', () => {
    expect(isDevAccessActive()).toBeFalse();
    sessionStorage.setItem('frontmeet.dev-access', '1');
    expect(isDevAccessActive()).toBe(runtimeConfig.devAccess);
  });
});
