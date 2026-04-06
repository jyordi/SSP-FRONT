import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoExpedienteCivico } from './nuevo-expediente-civico';

describe('NuevoExpedienteCivico', () => {
  let component: NuevoExpedienteCivico;
  let fixture: ComponentFixture<NuevoExpedienteCivico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoExpedienteCivico]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoExpedienteCivico);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
