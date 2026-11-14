import { HttpErrorResponse } from '@angular/common/http';
import { AppError } from './app-error';
describe('Backend errors',()=>{
  it('normalizes server codes and field paths for the existing Spanish forms',()=>{
    const e=AppError.from(new HttpErrorResponse({status:400,error:{code:'INVALID_PROFILE',message:'Datos inválidos',fields:[{field:'complete.request.firstName',message:'Obligatorio'}]}}));
    expect(e.code).toBe('invalid-profile');expect(e.fieldErrors).toEqual([{field:'nombres',message:'Obligatorio'}]);
  });
  it('does not turn every 409 into a username collision',()=>{
    const e=AppError.from(new HttpErrorResponse({status:409,error:{code:'PROFILE_ALREADY_COMPLETE',message:'Ya completado'}}));
    expect(e.code).toBe('profile-already-complete');expect(e.code).not.toBe('username-taken');
  });
});
