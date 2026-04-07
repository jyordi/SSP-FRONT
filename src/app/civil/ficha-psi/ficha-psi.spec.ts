import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FichaPsi } from './ficha-psi';

describe('FichaPsi', () => {
  let component: FichaPsi;
  let fixture: ComponentFixture<FichaPsi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FichaPsi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FichaPsi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
