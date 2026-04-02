import { TestBed } from '@angular/core/testing';

import { Expedientes } from './expedientes';

describe('Expedientes', () => {
  let service: Expedientes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Expedientes);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
