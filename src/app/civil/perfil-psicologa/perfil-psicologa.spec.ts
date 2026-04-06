import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilPsicologa } from './perfil-psicologa';

describe('PerfilPsicologa', () => {
  let component: PerfilPsicologa;
  let fixture: ComponentFixture<PerfilPsicologa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilPsicologa]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PerfilPsicologa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
