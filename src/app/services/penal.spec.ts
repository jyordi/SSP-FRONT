import { TestBed } from '@angular/core/testing';

import { Penal } from './penal';

describe('Penal', () => {
  let service: Penal;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Penal);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
