import { FormControl } from '@angular/forms';

import { codeFormatValidator, requiredTrimmedValidator } from './room.validators';

describe('room validators', () => {
  it('treats whitespace-only names as empty', () => {
    const validate = requiredTrimmedValidator();
    expect(validate(new FormControl('   '))).toEqual({ required: true });
    expect(validate(new FormControl(' Cálculo '))).toBeNull();
  });

  it('delegates the code format to the provided check and ignores empty values', () => {
    const validate = codeFormatValidator((raw) => raw === 'OK');
    expect(validate(new FormControl('nope'))).toEqual({ codeFormat: true });
    expect(validate(new FormControl('OK'))).toBeNull();
    expect(validate(new FormControl(''))).toBeNull();
  });
});
