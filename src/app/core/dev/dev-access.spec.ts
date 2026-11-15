import { isDevAccessActive } from './dev-access';

describe('dev access flag', () => {
  afterEach(() => sessionStorage.removeItem('frontmeet.dev-access'));

  it('is inactive unless the session flag is set', () => {
    expect(isDevAccessActive()).toBeFalse();
    sessionStorage.setItem('frontmeet.dev-access', '1');
    expect(isDevAccessActive()).toBeTrue();
  });
});
