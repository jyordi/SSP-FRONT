import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PenalForm } from './penal-form';

describe('PenalForm', () => {
  let component: PenalForm;
  let fixture: ComponentFixture<PenalForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PenalForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PenalForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
