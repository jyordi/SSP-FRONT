import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetallePenal } from './detalle-penal';

describe('DetallePenal', () => {
  let component: DetallePenal;
  let fixture: ComponentFixture<DetallePenal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallePenal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetallePenal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
