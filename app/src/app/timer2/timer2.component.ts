/*
не работает получение во внешнем потоке последнего
значения вложенного потока
*/

import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import {
  Observable,
  fromEvent,
  interval,
  merge,
  concat,
  noop,
  NEVER,
  of,
} from 'rxjs';
import {
  map,
  mapTo,
  scan,
  startWith,
  switchMap,
  mergeMap,
  tap,
  publish,
  refCount,
} from 'rxjs/operators';
import { buffer, filter, throttleTime } from 'rxjs/operators';

enum Timer2ClickButton {
  startButton,
  waitButton,
  resetButton,
  stopButton,
}

interface Time2StateCommand {
  isStarted: boolean;
  isWaited: boolean;
  command: Timer2ClickButton;
  currentSecond: number;
}

@Component({
  selector: 'app-timer2',
  templateUrl: './timer2.component.html',
  styleUrls: ['./timer2.component.scss'],
})
export class Timer2Component implements OnInit, AfterViewInit {
  @ViewChild('startButton') startButton: ElementRef;
  @ViewChild('waitButton') waitButton: ElementRef;
  @ViewChild('resetButton') resetButton: ElementRef;

  data: Observable<Date>;
  secondsAfterStart: number = 0;

  constructor() {}

  ngOnInit(): void {
    // this.data = NEVER.pipe(startWith(new Date(2020, 0, 1, 0, 0, 0)));
  }

  ngAfterViewInit() {
    let stream = (b, t) => fromEvent(b, 'click').pipe(mapTo(t));
    let waitButtonStreamRaw$ = stream(
      this.waitButton.nativeElement,
      Timer2ClickButton.waitButton
    );
    let waitButtonStream$ = waitButtonStreamRaw$.pipe(
      buffer(waitButtonStreamRaw$.pipe(throttleTime(300))),
      filter((clickArray) => clickArray.length > 1),
      mapTo(Timer2ClickButton.waitButton)
    );
    let eventsRaw$ = merge(
      stream(this.startButton.nativeElement, Timer2ClickButton.startButton),
      waitButtonStream$,
      stream(this.resetButton.nativeElement, Timer2ClickButton.resetButton)
    );

    let events$ = eventsRaw$.pipe(
      map((x) => ({
        isStarted: false,
        isWaited: false,
        command: x,
        currentSecond: 0,
      })),
      scan(
        (s: Time2StateCommand, curr) => ({
          ...s,
          ...{
            isStarted:
              curr.command == Timer2ClickButton.startButton && !s.isStarted
                ? true
                : curr.command == Timer2ClickButton.startButton &&
                  s.isStarted &&
                  !s.isWaited
                ? false
                : s.isStarted,
          },
          ...{
            isWaited:
              curr.command == Timer2ClickButton.waitButton
                ? true
                : curr.command == Timer2ClickButton.startButton
                ? false
                : s.isWaited,
          },
          ...{
            command:
              s.command == Timer2ClickButton.stopButton
                ? curr.command
                : curr.command == Timer2ClickButton.startButton &&
                  s.isStarted &&
                  !s.isWaited
                ? Timer2ClickButton.stopButton
                : curr.command,
          },
        }),
        {
          isStarted: false,
          isWaited: false,
          command: Timer2ClickButton.stopButton,
          currentSecond: 0,
        }
      ),
      publish(),
      refCount()
    );

    let super$ = events$.pipe(
      startWith({
        isStarted: false,
        isWaited: false,
        command: Timer2ClickButton.stopButton,
        currentSecond: 0,
      }),
      switchMap((e) => {
        if (e.isStarted && !e.isWaited) {
          let startValue = e.currentSecond;
          return interval(1000).pipe(
            map((x) => ({ ...e, ...{ currentSecond: startValue + x } }))
          );
        } else {
          return NEVER.pipe(startWith(e));
        }
      }),
      publish(),
      refCount()
    );

    let data$ = super$.pipe(
      // tap((x) => (this.secondsAfterStart = x.currentSecond)),
      map((x) => new Date(2020, 0, 1, 0, 0, x.currentSecond))
    );
    this.data = data$;
    events$.subscribe((x) => {
      console.log(x);
    });
    data$.subscribe((x) => {
      console.log(x.toTimeString().substr(0, 8));
    });
  }
}
