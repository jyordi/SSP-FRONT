import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilGuia } from './perfil-guia';

describe('PerfilGuia', () => {
  let component: PerfilGuia;
  let fixture: ComponentFixture<PerfilGuia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilGuia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PerfilGuia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
