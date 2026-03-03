import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelePerfil } from './sele-perfil';

describe('SelePerfil', () => {
  let component: SelePerfil;
  let fixture: ComponentFixture<SelePerfil>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelePerfil]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelePerfil);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
