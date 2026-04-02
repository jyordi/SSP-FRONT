import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValoracionPenal } from './valoracion-penal';

describe('ValoracionPenal', () => {
  let component: ValoracionPenal;
  let fixture: ComponentFixture<ValoracionPenal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValoracionPenal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValoracionPenal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
