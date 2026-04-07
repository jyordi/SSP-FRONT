import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotasPsi } from './notas-psi';

describe('NotasPsi', () => {
  let component: NotasPsi;
  let fixture: ComponentFixture<NotasPsi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotasPsi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotasPsi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
