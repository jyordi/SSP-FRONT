import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormuPsico } from './formu-psico';

describe('FormuPsico', () => {
  let component: FormuPsico;
  let fixture: ComponentFixture<FormuPsico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormuPsico]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormuPsico);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
