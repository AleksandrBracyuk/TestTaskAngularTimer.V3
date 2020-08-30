import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { Timer2Component } from './timer2/timer2.component';
import { Timer2SimpleComponent } from './timer2-simple/timer2-simple.component';
import { Timer3ControlComponent } from './timer3/timer3-control/timer3-control.component';
import { Timer3DisplayComponent } from './timer3/timer3-display/timer3-display.component';

@NgModule({
  declarations: [AppComponent, Timer2Component, Timer2SimpleComponent, Timer3ControlComponent, Timer3DisplayComponent],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
