import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FichaTecnica } from './ficha-tecnica';

describe('FichaTecnica', () => {
  let component: FichaTecnica;
  let fixture: ComponentFixture<FichaTecnica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FichaTecnica]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FichaTecnica);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
