import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaraturaExpediente } from './caratura-expediente';

describe('CaraturaExpediente', () => {
  let component: CaraturaExpediente;
  let fixture: ComponentFixture<CaraturaExpediente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaraturaExpediente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CaraturaExpediente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
