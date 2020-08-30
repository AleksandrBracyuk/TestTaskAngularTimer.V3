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

@Component({
  selector: 'app-timer2-simple',
  templateUrl: './timer2-simple.component.html',
  styleUrls: ['./timer2-simple.component.scss'],
})
export class Timer2SimpleComponent implements OnInit, AfterViewInit {
  @ViewChild('waitButton') waitButton: ElementRef;

  data: Observable<Date>;
  secondsAfterStart: number = 0;
  isStarted: boolean = false;

  constructor() {}

  ngOnInit(): void {
    this.data = NEVER.pipe(startWith(new Date(2020, 0, 1, 0, 0, 0)));
  }

  ngAfterViewInit() {
    let waitButtonStreamRaw$ = fromEvent(
      this.waitButton.nativeElement,
      'click'
    ).pipe(mapTo(1));
    let waitButtonStream$ = waitButtonStreamRaw$.pipe(
      buffer(waitButtonStreamRaw$.pipe(throttleTime(300))),
      filter((clickArray) => clickArray.length > 1)
    );
    waitButtonStream$.subscribe((x) => this.pause());
  }

  switchStart() {
    if (this.isStarted) {
      this.stop();
    } else {
      this.start();
    }
  }
  start() {
    this.data = this.startStream();
    this.isStarted = true;
  }
  reset() {
    this.secondsAfterStart = 0;
    if (this.isStarted) {
      this.start();
    } else {
      this.pause();
    }
  }
  pause() {
    this.data = this.waitStream();
    this.isStarted = false;
  }
  stop() {
    this.isStarted = false;
    this.secondsAfterStart = 0;
    this.data = this.waitStream();
  }

  startStream(): Observable<Date> {
    let startValue = this.secondsAfterStart;
    return interval(1000).pipe(
      tap((x) => (this.secondsAfterStart = startValue + x)),
      map((x) => new Date(2020, 0, 1, 0, 0, startValue + x))
    );
  }
  waitStream(): Observable<Date> {
    return NEVER.pipe(
      startWith(new Date(2020, 0, 1, 0, 0, this.secondsAfterStart))
    );
  }
}
