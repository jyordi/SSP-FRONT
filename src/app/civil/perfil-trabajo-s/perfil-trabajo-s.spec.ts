import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilTrabajoS } from './perfil-trabajo-s';

describe('PerfilTrabajoS', () => {
  let component: PerfilTrabajoS;
  let fixture: ComponentFixture<PerfilTrabajoS>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilTrabajoS]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PerfilTrabajoS);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
