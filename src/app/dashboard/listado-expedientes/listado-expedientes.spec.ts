import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoExpedientes } from './listado-expedientes';

describe('ListadoExpedientes', () => {
  let component: ListadoExpedientes;
  let fixture: ComponentFixture<ListadoExpedientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoExpedientes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListadoExpedientes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
