import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogsPasswordComponent } from './logs-password.component';

describe('LogsPasswordComponent', () => {
  let component: LogsPasswordComponent;
  let fixture: ComponentFixture<LogsPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogsPasswordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogsPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
