import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeleccionComponent } from './seleccion';

describe('SeleccionComponent', () => {
  let component: SeleccionComponent;
  let fixture: ComponentFixture<SeleccionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeleccionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeleccionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
