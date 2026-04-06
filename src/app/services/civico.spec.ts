import { TestBed } from '@angular/core/testing';

import { Civico } from './civico';

describe('Civico', () => {
  let service: Civico;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Civico);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
