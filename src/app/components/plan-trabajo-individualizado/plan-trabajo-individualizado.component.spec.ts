import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanTrabajoIndividualizadoComponent } from './plan-trabajo-individualizado.component';

describe('PlanTrabajoIndividualizadoComponent', () => {
  let component: PlanTrabajoIndividualizadoComponent;
  let fixture: ComponentFixture<PlanTrabajoIndividualizadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanTrabajoIndividualizadoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlanTrabajoIndividualizadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
