import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleCivico } from './detalle-civico';

describe('DetalleCivico', () => {
  let component: DetalleCivico;
  let fixture: ComponentFixture<DetalleCivico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleCivico]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleCivico);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
