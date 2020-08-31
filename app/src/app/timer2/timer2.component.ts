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
  currentSecond: number;
  isStarted: boolean;
  isWaited: boolean;
  command: Timer2ClickButton;
  commandDate: number;
  startDate: number;
  waitDate: number;
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

  constructor() {}

  ngOnInit(): void {
    // this.data = NEVER.pipe(startWith(new Date(2020, 0, 1, 0, 0, 0)));
  }

  private NextState(
    oldState: Time2StateCommand,
    command: Timer2ClickButton,
    commandDate: number
  ): Time2StateCommand {
    let ret = { ...oldState, ...{ command, commandDate } };
    let stateStart = oldState.isStarted && !oldState.isWaited;
    let stateStop = !oldState.isStarted;
    let stateWait = oldState.isStarted && oldState.isWaited;

    if (command == Timer2ClickButton.startButton) {
      ret.isStarted = stateStop
        ? true
        : stateStart
        ? false
        : oldState.isStarted;
      ret.isWaited = false;
      ret.command = stateStart ? Timer2ClickButton.stopButton : command;
      ret.startDate = stateWait
        ? commandDate - (oldState.waitDate - oldState.startDate)
        : /* он простоял ранее интервал (oldState.waitDate - oldState.startDate)
        поэтому тепеть он стартует конечно в commandDate, но чтобы счетчик учел время простоя - то время старта сдвигаем
        в прошлое на время простоя, т.е. на  (oldState.waitDate - oldState.startDate)*/
        stateStop
        ? commandDate
        : stateStart
        ? 0
        : ret.startDate;
      ret.waitDate = stateStop ? 0 : stateStart ? 0 : stateWait ? 0 : 0;
      ret.currentSecond = stateStop
        ? 0
        : stateStart
        ? Math.round((oldState.commandDate - oldState.startDate) / 1000)
        : stateWait
        ? Math.round((oldState.waitDate - oldState.startDate) / 1000)
        : 0;
    } else if (command == Timer2ClickButton.waitButton) {
      ret.isWaited = true;
      ret.waitDate = stateStart ? commandDate : ret.waitDate;
      ret.currentSecond = stateStart
        ? Math.round((oldState.commandDate - oldState.startDate) / 1000)
        : ret.currentSecond;
    } else if (command == Timer2ClickButton.resetButton) {
      ret.startDate = stateStart ? commandDate : 0;
      ret.waitDate = 0;
      ret.currentSecond = 0;
    } else if (command == Timer2ClickButton.stopButton) {
      ret.isStarted = false;
      ret.isWaited = false;
      ret.startDate = 0;
      ret.waitDate = 0;
      ret.currentSecond = 0;
    }

    return ret;
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
      stream(this.waitButton.nativeElement, Timer2ClickButton.waitButton),
      // waitButtonStream$,
      stream(this.resetButton.nativeElement, Timer2ClickButton.resetButton)
    );

    let startItem = {
      currentSecond: 0,
      isStarted: false,
      isWaited: false,
      command: Timer2ClickButton.stopButton,
      commandDate: 0,
      startDate: 0,
      waitDate: 0,
    };
    let events$ = eventsRaw$.pipe(
      map((x) => ({
        command: x,
        commandDate: Date.now(),
      })),
      scan(
        (s: Time2StateCommand, curr) =>
          this.NextState(s, curr.command, curr.commandDate),
        startItem
      ),
      publish(),
      refCount()
    );

    let super$ = events$.pipe(
      // startWith(startItem),
      switchMap((e) => {
        let currentSecond =
          e.startDate > 0
            ? Math.round(
                ((e.waitDate > 0 ? e.waitDate : e.commandDate) - e.startDate) /
                  1000
              )
            : 0;

        if (e.isStarted && !e.isWaited) {
          // let waitedSecond =
          //   e.waitDate > 0
          //     ? Math.round((e.waitDate - e.startDate) / 1000)
          //     : Math.round((e.commandDate - e.startDate) / 1000);
          // console.log('switch 1', waitedSecond, e);
          console.log('switch 1', currentSecond, e);
          return interval(1000).pipe(
            map((x) => ({ ...e, ...{ currentSecond: currentSecond + x + 1 } }))
          );
        } else {
          // let waitedSecond =
          //   e.isStarted && e.isWaited
          //     ? Math.round((e.waitDate - e.startDate) / 1000)
          //     : 0;
          // console.log('switch 2', waitedSecond, e);
          console.log('switch 2', currentSecond, e);
          return NEVER.pipe(
            startWith({ ...e, ...{ currentSecond: currentSecond } })
          );
        }
      }),
      publish(),
      refCount()
    );

    let data$ = super$.pipe(
      map((x) => new Date(2020, 0, 1, 0, 0, x.currentSecond))
    );
    this.data = data$;
    // events$.subscribe((x) => {
    //   console.log(x);
    // });
    // data$.subscribe((x) => {
    //   console.log(x.toTimeString().substr(0, 8));
    // });

    super$.subscribe((x) => {
      console.log(x);
    });
  }
}
