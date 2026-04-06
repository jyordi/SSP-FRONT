import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoExpedientePenal } from './nuevo-expediente-penal';

describe('NuevoExpedientePenal', () => {
  let component: NuevoExpedientePenal;
  let fixture: ComponentFixture<NuevoExpedientePenal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoExpedientePenal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoExpedientePenal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
