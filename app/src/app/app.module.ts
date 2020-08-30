import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { Timer2Component } from './timer2/timer2.component';
import { Timer2SimpleComponent } from './timer2-simple/timer2-simple.component';

@NgModule({
  declarations: [AppComponent, Timer2Component, Timer2SimpleComponent],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
