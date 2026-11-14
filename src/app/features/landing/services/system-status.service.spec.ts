import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpSystemStatusService } from './system-status.service';
import { runtimeConfig } from '../../../core/config/runtime-config';
describe('Readiness and Firestore demo',()=>{
  let service:HttpSystemStatusService;let http:HttpTestingController;
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),HttpSystemStatusService]});service=TestBed.inject(HttpSystemStatusService);http=TestBed.inject(HttpTestingController);});
  afterEach(()=>http.verify());
  function ready(){http.expectOne(runtimeConfig.healthUrl).flush({status:'UP',checks:[{name:'firestore',status:'UP'}]});}
  it('displays the actual demo message rather than invented statistics',()=>{
    service.getStatus().subscribe(s=>{expect(s.api).toBe('UP');expect(s.firestore).toBe('UP');expect(s.sampleMessage).toBe('Dato real');});
    ready();http.expectOne(`${runtimeConfig.apiUrl}/demo`).flush({message:'Dato real'});
  });
  it('keeps readiness UP when the optional demo document is absent',()=>{
    service.getStatus().subscribe(s=>{expect(s.api).toBe('UP');expect(s.demoState).toBe('missing');expect(s.sampleMessage).toBeNull();});
    ready();http.expectOne(`${runtimeConfig.apiUrl}/demo`).flush({}, {status:404,statusText:'Not Found'});
  });
  it('reports a health failure and never requests demo after readiness fails',()=>{
    service.getStatus().subscribe({next:()=>fail('Expected a readiness error'),error:e=>expect(e.status).toBe(503)});
    http.expectOne(runtimeConfig.healthUrl).flush({status:'DOWN'},{status:503,statusText:'Unavailable'});
    http.expectNone(`${runtimeConfig.apiUrl}/demo`);
  });
});
