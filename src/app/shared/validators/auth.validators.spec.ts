import { FormControl } from '@angular/forms';
import { institutionalEmailValidator, usernameValidator } from './auth.validators';
describe('Server-aligned profile validation',()=>{
  it('matches NFKC username normalization and excludes dots',()=>{
    const validator=usernameValidator();
    expect(validator(new FormControl(' Ａｎａ_01 '))).toBeNull();expect(validator(new FormControl('1ana'))).toBeNull();
    expect(validator(new FormControl('ana.lopez'))).toEqual({pattern:true});
  });
  it('allows valid non-institutional email until domains are configured and uses exact matching',()=>{
    expect(institutionalEmailValidator([])(new FormControl('ana@gmail.com'))).toBeNull();
    const institutional=institutionalEmailValidator(['university.edu.co']);
    expect(institutional(new FormControl('ana@university.edu.co'))).toBeNull();
    expect(institutional(new FormControl('ana@sub.university.edu.co'))).toEqual({institutional:true});
  });
});
