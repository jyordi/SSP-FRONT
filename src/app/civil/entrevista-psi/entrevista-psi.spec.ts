import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntrevistaPsi } from './entrevista-psi';

describe('EntrevistaPsi', () => {
  let component: EntrevistaPsi;
  let fixture: ComponentFixture<EntrevistaPsi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntrevistaPsi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntrevistaPsi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
