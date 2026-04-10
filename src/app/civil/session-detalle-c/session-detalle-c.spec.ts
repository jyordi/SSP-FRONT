import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionDetalleC } from './session-detalle-c';

describe('SessionDetalleC', () => {
  let component: SessionDetalleC;
  let fixture: ComponentFixture<SessionDetalleC>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionDetalleC]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SessionDetalleC);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
