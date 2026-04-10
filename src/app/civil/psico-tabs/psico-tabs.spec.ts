import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PsicoTabs } from './psico-tabs';

describe('PsicoTabs', () => {
  let component: PsicoTabs;
  let fixture: ComponentFixture<PsicoTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PsicoTabs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PsicoTabs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
