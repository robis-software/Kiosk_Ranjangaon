import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CircularIndicatorComponent } from './circular-indicator.component';

describe('CircularIndicatorComponent', () => {
  let component: CircularIndicatorComponent;
  let fixture: ComponentFixture<CircularIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CircularIndicatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CircularIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
