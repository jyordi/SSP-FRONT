import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanDetalleAdmin } from './plan-detalle-admin';



describe('PlanDetalleAdmin', () => {
  let component: PlanDetalleAdmin;
  let fixture: ComponentFixture<PlanDetalleAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanDetalleAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanDetalleAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
