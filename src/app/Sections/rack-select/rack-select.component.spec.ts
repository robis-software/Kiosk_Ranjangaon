import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RackSelectComponent } from './rack-select.component';

describe('RackSelectComponent', () => {
  let component: RackSelectComponent;
  let fixture: ComponentFixture<RackSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RackSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RackSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
