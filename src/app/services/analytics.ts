import { Injectable }                                     from '@angular/core';
import { Location }                                       from '@angular/common';
import { Router, NavigationEnd, NavigationStart, Event }  from '@angular/router';
import { Env }                                            from './env';
import { Observable, Observer }                           from './observable';

/* Make ga typesafe, sortof */
declare var ga: Function;

@Injectable()
export class Analytics {

  private navStartedAt: number = 0;
  private currentRoute: string;

  constructor(
    private router: Router,
    private location: Location,
    private env: Env
  ) { }

  init(): void {
    ga('set', 'appVersion', this.env.version);
    
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        this.navStartedAt = performance.now();
      } else if (event instanceof NavigationEnd) {
        // When the route is '/', location.path actually returns ''.
        this.pageview(this.location.path() || '/');
      }
    });

    this.timing('angular', 'init', performance.now());
  }

  pageview(route: string): void {
    if (this.currentRoute != route) {
      ga('send', 'pageview', route);

      if (this.currentRoute == null) {
        this.timing('pageview', 'init', performance.now());
      }

      this.timing('pageview', 'load', performance.now() - this.navStartedAt, route);
      this.currentRoute = route;
    }
  }

  event(category: string, action: string, label?: string, value?: number): Observable<any> {
    return this.submit('send', 'event', {
      eventCategory: category,
      eventAction: action,
      eventLabel: label,
      eventValue: value
    });
  }

  timing(category: string, variable: string, value: number, label?: string): Observable<any> {
    return this.submit('send', 'timing', {
      timingCategory: category,
      timingVar: variable,
      timingValue: value,
      timingLabel: label
    });
  }

  exception(description: string, fatal?: boolean): Observable<any> {
    return this.submit('send', 'exception', {
      exDescription: description,
      exFatal: !!fatal
    });
  }

  private submit(method: string, type: string, data: Object): Observable<any> {
    let o = Observable.create((observer: Observer<any>) => {
      data['hitCallback'] = () => {
        observer.next('');
        observer.complete();
      };
      ga(method, type, data);
    });

    /* It is important that at least someone subscribes or it won't actually fire */
    o.subscribe();

    return o;
  }


}