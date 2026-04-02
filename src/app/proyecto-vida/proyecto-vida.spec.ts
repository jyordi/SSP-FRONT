import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProyectoVida } from './proyecto-vida';

describe('ProyectoVida', () => {
  let component: ProyectoVida;
  let fixture: ComponentFixture<ProyectoVida>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProyectoVida]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProyectoVida);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
