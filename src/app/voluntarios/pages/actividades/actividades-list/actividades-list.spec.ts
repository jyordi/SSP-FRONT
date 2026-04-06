import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActividadesList } from './actividades-list';

describe('ActividadesList', () => {
  let component: ActividadesList;
  let fixture: ComponentFixture<ActividadesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActividadesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActividadesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
