import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeguimientoPsi } from './seguimiento-psi';

describe('SeguimientoPsi', () => {
  let component: SeguimientoPsi;
  let fixture: ComponentFixture<SeguimientoPsi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeguimientoPsi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeguimientoPsi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
