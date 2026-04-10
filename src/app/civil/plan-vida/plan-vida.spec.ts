import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanVida } from './plan-vida';

describe('PlanVida', () => {
  let component: PlanVida;
  let fixture: ComponentFixture<PlanVida>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanVida]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanVida);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
