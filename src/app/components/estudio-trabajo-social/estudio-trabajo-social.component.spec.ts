import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstudioTrabajoSocialComponent } from './estudio-trabajo-social.component';

describe('EstudioTrabajoSocialComponent', () => {
  let component: EstudioTrabajoSocialComponent;
  let fixture: ComponentFixture<EstudioTrabajoSocialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstudioTrabajoSocialComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EstudioTrabajoSocialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
