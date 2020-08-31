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
import { Timer2Command } from './timer2-command.enum';
import { Timer2State } from './timer2-state.enum';

interface Time2StateCommand {
  command: Timer2Command;
  commandDate: number;
  state: Timer2State;
  currentSecond: number;
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
    command: Timer2Command,
    commandDate: number
  ): Time2StateCommand {
    let next = { ...oldState, ...{ command, commandDate } };

    let oldIsStart = oldState.state == Timer2State.start;
    let oldIsStop = oldState.state == Timer2State.stop;
    let oldIsWait = oldState.state == Timer2State.wait;
    let commandIsStart = command == Timer2Command.startCommand;
    let commandIsWait = command == Timer2Command.waitCommand;
    let commandIsReset = command == Timer2Command.resetCommand;
    let commandIsStop = command == Timer2Command.stopCommand;
    let start = Timer2State.start;
    let stop = Timer2State.stop;
    let wait = Timer2State.wait;

    if (commandIsStart) {
      if (oldIsStart) {
        next.command = Timer2Command.stopCommand;
        commandIsStart = false;
        commandIsStop = true;
      }
    }

    if (commandIsStart) {
      if (oldIsStart) {
        //----не бывает, см. выше - это команда stop---
      }
      if (oldIsStop) {
        next.state = start;
        next.startDate = commandDate;
        next.currentSecond = 0;
      }
      if (oldIsWait) {
        next.state = start;
        next.startDate = commandDate - (oldState.waitDate - oldState.startDate);
        next.waitDate = 0;
        next.currentSecond = Math.round(
          (oldState.waitDate - oldState.startDate) / 1000
        );
      }
    }
    if (commandIsWait) {
      if (oldIsStart) {
        next.state = wait;
        next.waitDate = commandDate;
        next.currentSecond = Math.round(
          (oldState.commandDate - oldState.startDate) / 1000
        );
      }
    }
    if (commandIsReset) {
      if (oldIsStart) {
        next.startDate = commandDate;
        next.currentSecond = 0;
      }
      if (oldIsWait) {
        next.startDate = commandDate;
        next.waitDate = commandDate;
        next.currentSecond = 0;
      }
    }
    if (commandIsStop) {
      next.state = stop;
      next.startDate = 0;
      next.waitDate = 0;
      next.currentSecond = 0;
    }
    console.log('NextState', next);
    return next;
  }

  ngAfterViewInit() {
    let stream = (b, t) => fromEvent(b, 'click').pipe(mapTo(t));
    let waitButtonStreamRaw$ = stream(
      this.waitButton.nativeElement,
      Timer2Command.waitCommand
    );
    let waitButtonStream$ = waitButtonStreamRaw$.pipe(
      buffer(waitButtonStreamRaw$.pipe(throttleTime(300))),
      filter((clickArray) => clickArray.length > 1),
      mapTo(Timer2Command.waitCommand)
    );
    let eventsRaw$ = merge(
      stream(this.startButton.nativeElement, Timer2Command.startCommand),
      stream(this.waitButton.nativeElement, Timer2Command.waitCommand),
      // waitButtonStream$,
      stream(this.resetButton.nativeElement, Timer2Command.resetCommand)
    );

    let startItem = {
      command: Timer2Command.stopCommand,
      commandDate: 0,
      state: Timer2State.stop,
      startDate: 0,
      waitDate: 0,
      currentSecond: 0,
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
        if (e.state == Timer2State.start) {
          // console.log('switch 1', currentSecond, e);
          if (e.command != Timer2Command.resetCommand) {
            return interval(1000).pipe(
              map((x) => ({
                ...e,
                ...{ currentSecond: currentSecond + x + 1 },
              }))
            );
          } else {
            return interval(1000).pipe(
              startWith(0),
              map((x) => ({
                ...e,
                ...{ currentSecond: currentSecond + x },
              }))
            );
          }
        } else {
          // console.log('switch 2', currentSecond, e);
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

    // super$.subscribe((x) => {
    //   console.log(x);
    // });
  }
}
