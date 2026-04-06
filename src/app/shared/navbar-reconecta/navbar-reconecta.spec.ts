import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarReconecta } from './navbar-reconecta';

describe('NavbarReconecta', () => {
  let component: NavbarReconecta;
  let fixture: ComponentFixture<NavbarReconecta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarReconecta]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavbarReconecta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
