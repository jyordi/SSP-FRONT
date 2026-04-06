import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonasList } from './personas-list';

describe('PersonasList', () => {
  let component: PersonasList;
  let fixture: ComponentFixture<PersonasList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonasList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonasList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
